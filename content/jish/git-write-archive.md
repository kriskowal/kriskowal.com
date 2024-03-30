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

# `git-write-archive`

Here’s the script in full.

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
