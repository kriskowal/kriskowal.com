---
title: The JISH Stack
layout: layouts/post.njk
tags:
- posts
- home
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

`jq` accepts file variables.

```console
$ jq -nr '"\($hello), \($world)!"' \
  --rawfile hello <(echo -n Hello) \
  --rawfile world <(echo -n World)
```

`jq` accepts JSON formatted file variables.

```console
$ jq '. + $update' \
  <(jq -n '{a: 10}') \
  --argfile update <(jq -n '{b: 20}')
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
$ paste <(jot 3) <(yes - | head -n 3)
1	-
2	-
3	-
```

Really, `paste` is more like the `zip` for iterators.

```console
$ jot 9 | paste - - -
1	2	3
4	5	6
7	8	9
```

On Linux, `jot` is spelled `seq`.

You can use `xargs` to batch tuples.

```console
$ paste <(jot 3) <(yes '>' | head -n 3) | xargs -n 2 echo '<'
< 1 >
< 2 >
< 3 >
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

```bash
while
  git fetch origin
  PREV=$(git rev-parse origin/main)
  # ... Make NEXT from PREV
  ! git push --force-with-lease=$NEXT:$PREV
do true; done
```

Git branches do not need to be checked out.
Commands like `git hash-object`, `git mktree`, and `git commit-tree` generate
objects on the fly.

```bash
FILE=$(jot 10 | git hash-object -w --stdin)
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

<a name="dagger">[†](#no-arrays) It is dangerous to go alone. Take this.</a>
