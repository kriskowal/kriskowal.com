---
title: The JISH Stack
layout: layouts/post.njk
tags:
- posts
- home
- JISH
date: 2024-01-31
---

The JISH stack is the extraordinary combination of `bash`, `git`, and `jq`.

```
  Jq
  gIt
+ baSH
------
  JISH
```

The JISH stack has three precepts and many tenets:

* Give unto `bash` chonky long-lived pipelines.
* Give unto `jq` data and math.
* Give unto `git` temporary files and transactions.

Be wary of the maximum command line argument length.
Repeat after me: bash does not support <a
name="no-arrays">arrays[†](#dagger)</a>.
Bash supports _file variables_.

Here’s how you write to a file variable:

```console
$ HI=$(echo hello | git hash-object -w --stdin)
```

Here’s how you read from a file variable:

```console
$ git cat-file blob "$HI"
```

Never use `mktemp` again.
Your temporary files will go away next time `git` does `gc`.

With process substitution, file variables don’t need names.

```console
$ jq -rR ascii_upcase <(git cat-file blob "$HI")
HELLO
```

Some commands like `diff` and `comm` accept multiple file variables.
This command shows you which lines of `x` are duplicates.

```bash
diff <(sort x) <(sort -u x)
```

Concatenate file variables.
This program writes out a list of numbers from 1 to 20.

```bash
LIST=$(git hash-object -w /dev/null)
LIST=$(git hash-object -w <(
  git cat-file blob "$LIST"
  seq 10
))
LIST=$(git hash-object -w <(
  git cat-file blob "$LIST"
  seq 11 20
))
git cat-file blob "$LIST"
```

`jq` accepts file variables.

```console
$ jq -nr '"\($hello), \($world)!"' \
  --rawfile hello <(echo -n Hello) \
  --rawfile world <(echo -n World)
```

`jq` accepts JSON stream file variables.

```console
$ jq '. + $update[0]' \
  <(jq -n '{a: 10}') \
  --slurpfile update <(jq -n '{b: 20}')
{
  "a": 10,
  "b": 20
}
```

<a name="echo">

Echo is not for JSON.
Don’t even think about it.

```console
$ jq -n '{$a}' --arg a '{"'
{
  "a": "{\""
}
```

</a>

You may have heard of `cut`.
The function you know as `zip` in languages like Python is called `paste` in
in a shell.

```console
$ paste <(seq 3) <(yes - | head -n 3)
1	-
2	-
3	-
```

Really, `paste` is more like the `zip` for iterators.

```console
$ seq 9 | paste - - -
1	2	3
4	5	6
7	8	9
```

You can use `xargs` to batch tuples.

```console
$ paste <(seq 3) <(yes '>' | head -n 3) | xargs -n 2 echo '<'
< 1 >
< 2 >
< 3 >
```

Pipelines can branch with process substitution.
This program divides the numbers from 1 to 20 between `even.txt` and `odd.txt`.

```bash
seq 20 |
  tee >(jq 'select(. % 2 == 0)' > even.txt) |
  jq 'select(. % 2 == 1)' > odd.txt
```

You can use `jq` to sum numbers.

```bash
$ seq 100 | jq --slurp add
5050
```

Unfortunately, `jq` is not so great with hexadecimal, but `printf` can manage.

```bash
$ printf "%d\n" "0xA"
10
```

Which is relevant, because you can get hexadecimal out of `/dev/random` using
`xxd`, which is available anywhere `vim` exists.
It’s `vim` in a trenchcoat.

```bash
$ xxd /dev/random | head -n2
00000000: 5d19 0642 b89a a7f6 5a65 4ba6 0dfe 5348  ]..B....ZeK...SH
00000010: eaaa 565c fa1e df1b b22f 8c9f 8ed1 c1ad  ..V\...../......

$ xxd -c4 -g0 -l4 /dev/random
00000000: 551ed68f  U...

$ xxd -c4 -g0 -l4 /dev/random | cut -d' ' -f2
c5ed9d80

$ printf "%d\n" "0x$(xxd -c4 -g0 -l4 /dev/random | cut -d' ' -f2)"
1676787677
```

Do not try to use shifty positional arguments in `bash`.
Prefix a command or function call with any number of keyword arguments.
These do not persist and you need not sully yourself with `local`.

```bash
$ X=1
$ X=2 bash -c 'echo "$X"'
2
$ echo "$X"
1
```

Remember at all times that shell scripts are dynamically scoped, functions are
not reentrant, and that any amount of hard work should be done in `jq`.

Don’t pester the system clock.

```bash
NOW=$(date)
```

Git is a database and supports transactions.
This routine attempts to push a change that must be based on the exact prior
repository state, and retries with [exponential backoff and full jitter](
https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/).

```bash
while
  read -r ATTEMPT
  git fetch origin
  PREV=$(git rev-parse origin/main)
  # ... Make NEXT from PREV
  ! git push --force-with-lease=$NEXT:$PREV
do
  sleep "$(($RANDOM % (2 ** $ATTEMPT)))"
done < <(seq infinity)
```

Git branches do not need to be checked out.
Commands like `git hash-object`, `git mktree`, and `git commit-tree` generate
objects on the fly.

```bash
FILE=$(seq 10 | git hash-object -w --stdin)
TREE=$(echo "100644 blob $FILE"$'\t'"lines.txt" | git mktree)
NEXT=$(
  echo 'Add lines.txt' | \
  GIT_AUTHOR_NAME=You \
  GIT_AUTHOR_EMAIL=you@example.com \
  GIT_AUTHOR_DATE=$NOW \
  GIT_COMMITTER_NAME=You \
  GIT_COMMITTER_EMAIL=you@example.com \
  GIT_COMMITTER_DATE=$NOW \
  git commit-tree "$TREE" -p "$PREV"
)
```

Git allows you to address individual files from any commit or tree.

```console
$ git cat-file blob "$TREE:lines.txt" | paste - -
1	2
3	4
5	6
7	8
9	10
```

If there is any chance a variable starts with `-` or `--`, most commands
stop parsing arguments as flags after a `--` argument.

```console
FILE=--lines.txt
touch -- "$FILE"
rm -- "$FILE"
```

Just, don’t get too pedantic about it.
Fully qualified paths will never start with `--`.

Resolve paths to assets installed near your script with the `BASH_SOURCE`
“array”.

```bash
ASSETDIR=$(dirname "${BASH_SOURCE[0]}")
source "$ASSETDIR/library.sh"
cat "$ASSETDIR/resource.json"
```

JISH stack is unreadable.
Write comments that explain everything including the behavior of every flag you
use, every time.

This shows you the intersection of sets `x` and `y`:

```bash
# We want column 3, suppress 1 and 2.
comm -12 <(sort x) <(sort y)
```

This shows you lines from `x` that are absent in `y`:

```bash
# We want column 1, suppress 2 and 3.
comm -23 <(sort x) <(sort y)
```

This shows you lines from `y` that are absent in `x`:

```bash
# We want column 2, suppress 1 and 3.
comm -13 <(sort x) <(sort y)
```

This shows you the union of sets `x` and `y`:

```bash
# Union of sets x and y
sort -u x y
```

This preamble will save you a lot of trouble.

```bash
#!/bin/bash
set -ueo pipefail
IFS=$'\t\n'
```

Use [`shellcheck`](https://www.shellcheck.net/).

---

# Appendix

## Exponential Backoff with Full Jitter

The previous example of pushing to `git` with exponential backoff used `bash`
math so was limited to integer-second back-off durations.
Frankly, I have run the above loop in a production system with thousands of
humans submitting transactions at human-driven frequencies and the tool would
have worked often enough without a retry loop that no one would have noticed or
cared, and that program had no back-off at all.

_However_, for the sake of commitment to the bit, the following program
supports back-off with 32 bit resolution jitter.

```bash
#!/bin/bash
set -ueo pipefail
IFS=$'\t\n'

function generate_backoff() {
  # generate a stream of two columns:
  # 1. powers of two
  # 2. random 32 bit integers
  paste <(
    while read -r ATTEMPT; do
      # jq does not support exponentiation,
      # so we give it a boost
      echo "$((2 ** ATTEMPT))"
    done < <(seq infinity)
  ) <(
    while read -r RAND; do
      # jq does not support hexadecimal,
      # so we convert to decimal
      printf "%d\n" "0x$RAND"
    done < <(
      # stream blocks of 8 hexadecimal nybbles out
      # of the system random number source
      xxd -c4 -g0 /dev/random |
        cut -f2 -d' '
    )
  ) |
  # From that stream of tuples, compute
  # a time to sleep between attempts.
  jq -R '
    # parse tab separated numbers
    [split("\t")[] | tonumber]
    as [$base, $random] |
    $base * $random / 4294967295
  ' | head -n 10
}

while
  read -r BACKOFF
  # ! your_job_that_may_fail_here
do
  echo sleep "Retrying in $BACKOFF seconds..."
  sleep "$BACKOFF"
done < <(generate_backoff)
```

## Generating Github Pages

The following program overwrites a `gh-pages` branch without touching your
working copy, without switching branches.
It does this by creating a temporary stage for a commit and building files
directly into the `git` database.

```bash
#!/bin/bash
set -ueo pipefail
IFS=$'\t\n'

HERE=$(dirname "${BASH_SOURCE[0]}")

# For this project, I am using a JavaScript bundler I have installed with npm.
export PATH="$HERE/node_modules/.bin:$PATH"

# Git stores directories in a text file that it calls a "tree".
# The text file is a table that captures the mode, (space), type, (space), hash,
# (tab), and name of each entry.
# This correspond to the output format of git ls-tree.
# We can generate a directory list from whole cloth for all of the files we
# must generate for gh-pages.
function gentree() {
  # The bundle command writes a JavaScript file to stdout.
  # We capture that data into the git object store and interpolate the
  # corresponding hash.
  echo "100644 blob $(git hash-object -w <(bundle index.js))"$'\t'"bundle.js"
  # Likewise, we simply copy bundle.html from our working copy but name it
  # index.html instead.
  echo "100644 blob $(git hash-object -w bundle.html)"$'\t'"index.html"
  # We just copy CNAME and index.css
  echo "100644 blob $(git hash-object -w CNAME)"$'\t'"CNAME"
  echo "100644 blob $(git hash-object -w index.css)"$'\t'"index.css"
}

# Capture the hash of the generated directory.
TREE=$(gentree | git mktree)
# Then, from the tree we can create a commit (an orphan with no --parent
# commit).
# Git commit-tree takes the commit message from stdin.
COMMIT=$(git commit-tree $TREE < <(echo Create bundles))
# We overwrite our new gh-branch reference to the generated commit.
git update-ref refs/heads/gh-pages $COMMIT
```

---

More about JISH:

- [Tar to Git](/jish/git-write-archive/)

---

<a name="dagger">[†](#no-arrays) It is dangerous to go alone. Take this.</a>
