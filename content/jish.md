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

The JISH stack has three tenets:

* Give unto `bash` chonky long-lived pipelines.
* Give unto `jq` data and math.
* Give unto `git` temporary files and transactions.

Be wary of the maximum command line argument length.
Repeat after me: bash does not support arrays†.
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
Your temporary files will go away next time `git` does a `git gc`.

With process substitution, file variables don’t need names.

```console
$ jq -rR ascii_upcase <(git cat-file blob "$HI")
HELLO
```

Some commands like `diff` and `comm` accept multiple file variables.
This command shows you whether `x` is sorted.

```console
$ diff x <(sort x)
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

Echo is not for JSON.
Don’t even think about it.

```console
$ jq -n '{$a}' --arg a '{"'
{
  "a": "{\""
}
```

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

> On Linux, `jot` is spelled `seq`.

You can use `xargs` to batch tuples.

```console
$ paste <(jot 3) <(yes - | head -n 3) | xargs -n 2 echo '>'
> 1 -
> 2 -
> 3 -
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

Git is a database and supports transactions.

```bash
git fetch origin
PREV=$(git rev-parse origin/main)
# Make NEXT from PREV
git push --force-with-lease=$NEXT:$PREV
# Try again from top if push fails
```

Git branches do not need to be checked out.
Commands like `git hash-object`, `git mktree`, and `git commit-tree` generate
objects on the fly.

```console
FILE=$(jot 10 | git hash-object -w --stdin)
TREE=$(echo "100644 blob $FILE"$'\t'"lines.txt" | git mktree)
NEXT=$(
  echo 'Add lines.txt' | \
  GIT_AUTHOR_NAME=You \
  GIT_AUTHOR_EMAIL=you@example.com \
  GIT_AUTHOR_DATE=$(date) \
  GIT_COMMITTER_NAME=You \
  GIT_COMMITTER_EMAIL=you@example.com \
  GIT_COMMITTER_DATE=$(date) \
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

This preamble will save you a lot of trouble.

```bash
#!/bin/bash
set -ueo pipefail
IFS=$'\t\n'
```

Use `shellcheck`.
