---
title: Tar to Git
layout: layouts/post.njk
tags:
- posts
- home
- JISH
date: 2024-03-30
---

Any fool knows you can use `git archive` to generate a `.tar` ball
from any tree or subtree.

```bash
git archive HEAD:path/to/root | tar tf -
```

But, Git has no mechanism for ingesting a `tar`.
However, Git does have the plumbing to make this easy,
and is a testament to the expressivity of the [JISH](/jish/) stack.

---

Let us begin as we always begin.

```bash
#!/bin/bash
set -ueo pipefail
```

This program reads a tarball from `stdin`,
stores its content in `git`,
and prints the hash at the root of the resulting tree.

Every `git` repository has an “index” which it sometimes calls a “stage” or
“cache”.
We will be moving all the files in this tarball onto a temporary stage,
completely unrelated to the files in your working copy.

```bash
export GIT_INDEX_FILE=$(mktemp -t git-write-archive-index.XXXX)
function cleanup() {
  rm "$GIT_INDEX_FILE"
}
trap cleanup EXIT
```

We need a `--to-command` flag supported by GNU tar that is not in BSD
tar.
This can be installed on a Mac with `brew install gnu-tar` and will be
named `gtar` on the path.
In its absence, we will trust that `tar` is GNU tar, as it will be on a
GNU/Linux system.
If this is a Mac without `gtar`, we’ll explode later.

```bash
TAR=$(command -v gtar || command -v tar)
```

We first initialize our temporary index.

```bash
git read-tree --empty
```

Then, we use the `tar` command to extract the files
from the archive.
Instead of writing them to the file system, we will have `tar` send
them to a shell command.

```bash
"$TAR" xf - --to-command '
```

Then, for all files in the archive, we use `git hash-object` to compute
the SHA1 and write the content into the `git` content address store for
future reference.
Then, we print out a line from a Git tree with the assumed mode,
hash, and path.

```bash
  if [ "$TAR_FILETYPE" == "f" ]; then
    printf "100644 blob %s\t%s\n" \
      "$(git hash-object -w --stdin)" \
      "$TAR_FILENAME"
  fi
```

We pipe this listing into `git update-index`, which stages all these
files.
The `update-index` subcommand accepts `--index-info` on `stdin`, which
is the format of a `git tree`, except that it allows paths with
subdirectories.

```bash
' | git update-index --add --index-info
```

The `git write-tree` command gathers up the stage, creates or updates
any subtrees, then percolates and prints the root hash.

```bash
git write-tree
```

---

That concludes `git-write-archive.js`.
You can use the generated hash anywhere Git trees are bought or sold.

So, if you had an archive `archive.tar` that contained
`path/to/file.txt`, you could ingest the archive and retrieve that
file.

```bash
TREE=$(git-write-archive.sh < archive.tar)
git show "$TREE"
git ls-tree "$TREE"
git ls-tree "$TREE:path"
git ls-tree "$TREE:path/to"
git show "$TREE:path/to/file.txt"
git cat-file blob "$TREE:path/to/file.txt"
```

And of course, you can just create a commit, name it to a branch, and
push.

```bash
COMMIT=$(git commit-tree "$TREE" < <(echo archive.tar))
git update-ref refs/heads/archive "$COMMIT"
git push origin refs/heads/archive
```

Here’s the script in full.

`git-write-archive`

```bash
#!/bin/bash

# reads a tarball from stdin,
# stores all its content in git,
# and prints the hash of the resulting tree.

set -ueo pipefail

export GIT_INDEX_FILE=$(mktemp -t git-write-archive-index.XXXX)
function cleanup() {
  rm "$GIT_INDEX_FILE"
}
trap cleanup EXIT

TAR=$(command -v gtar || command -v tar)

git read-tree --empty
"$TAR" xf - --to-command '
  if [ "$TAR_FILETYPE" == "f" ]; then
    printf "100644 blob %s\t%s\n" \
      "$(git hash-object -w --stdin)" \
      "$TAR_FILENAME"
  fi
' | git update-index --add --index-info
git write-tree
```

And if creating and cleaning up a temporary index chafes against your sense of
ideolgical purity, it is of course possible to roll up the tree hashes without
it.

`git-write-archive`

```bash
#!/bin/bash
set -ueo pipefail

# Reads a tarball from stdin,
# stores all its content in git,
# and prints the hash of the resulting tree.

TAR=$(command -v gtar || command -v tar)

STATE=$(
  "$TAR" xf - --to-command '
    if [ "$TAR_FILETYPE" == "f" ]; then
      printf "100644 blob %s\t%s\n" \
        "$(git hash-object -w --stdin)" \
        "$TAR_FILENAME"
    fi
  ' | git hash-object -w --stdin
)

# We must construct trees for every set of paths that share the same parent
# directory.
# We do this in multiple passes.
# In each pass, we find all the paths that have the most path components and
# generate a tree for all of the paths that have a common parent directory
# path.
# We are guaranteed that the path with the most path components will have one
# less component on the next pass, and it can get rolled up with its peers.
while
  PLAN=$(
    git cat-file blob "$STATE" | jq -R '

      # Parse the Git tree format.
      . as $entry |
      split("\t") as [$meta, $path] |
      $meta | split(" ") as [$mode, $type, $hash] |

      # Break paths into components.
      $path | split("/") as $parts |

      # Pre-compute dirname and filename.
      {
        $entry,
        $path,
        $parts,
        dirname: ($parts[0:-1] | join("/")),
        filename: $parts[-1],
        $hash,
        $type,
        $mode,
      }

    # Bring all of the entries into a single array.
    ' | jq --slurp -r '

      # Group all entries by how many path components they have, from most to
      # fewest.
      group_by(.parts | length | -.) as $groups |
      (

        # Report the maximum path depth.
        # We are done when we get to 1.
        ($groups[0][0].parts | length),

        # For all the entries that have the most path components, group them by
        # their common parent directory.
        (
          $groups[0] | group_by(.dirname)[] | (

            # Report the directory name they all share.
            .[0].dirname,
            # And write out the entry for their tree.
            # We only use the filename, the final path component, since these
            # will all get rolled up into a tree.
            (.[] | "\(.mode) \(.type) \(.hash)\t\(.filename)"),
            # Terminator:
            ""
          )
        ),
        # Terminator:
        "",

        # All remaining entries with fewer path components.
        # Preserve them for the next pass.
        (
          $groups[1:][][] | .entry
        )
      )
    ' | git hash-object -w --stdin
  )

  # Read out the maximum path component length from this pass.
  DEPTH=$(git cat-file blob "$PLAN" | head -n1)
  # If it's down to one, we're done.
  [ "$DEPTH" != 1 ]

do
  # Aggregate the entries with the longest path component length into Git
  # trees.
  STATE=$(
    git cat-file blob "$PLAN" | {
      # Consume the depth annotation we used above for the loop guard.
      read -r DEPTH

      # For each group of entries with a common parent directory, until the
      # empty line denoting the end of the list:
      while
        read -r DIRNAME
        [ "$DIRNAME" != "" ]
      do
        # Create a Git tree and capture the resulting hash.
        HASH=$(
          # Reading every entry until the empty line denoting the end of the
          # list:
          while
            read ENTRY
            [ "$ENTRY" != "" ]
          do
            echo "$ENTRY"
          done | git mktree
        )
        # Write out the full directory name and tree hash in Git tree format.
        # This will get aggregated with its peers on the next pass.
        printf "040000 tree $HASH\t$DIRNAME\n"
      done

      # Pass all remaining unprocessed entries through for the next pass.
      cat
    } | git hash-object -w --stdin
  )
done

# Capture the root tree and report its hash.
git cat-file blob "$STATE" | git mktree
```
