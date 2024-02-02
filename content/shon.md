---
title: SHON (SHell Object Notation)
layout: layouts/post.njk
tags:
- posts
- home
date: 2015-09-29
---

SHON is a command line notation for JSON.
SHON lends itself better to command line usage for the purposes of
interpolating variables.

Type          | JSON                 | SHON
------------- | -------------------- | ---------------------
Object        | `{"hello": "World"}` | `[ --hello World ]`
Array         | `["beep", "boop"]`   | `[ beep boop ]`
Array         | `[1, 2, 3]`          | `[ 1 2 3 ]`
Empty Array   | `[]`                 | `[ ]` or `[]`
Object        | `{"a": 10, b: 20}`   | `[ --a 10 --b 20 ]`
Empty Object  | `{}`                 | `[--]`
Number        | `1`                  | `1`
Number        | `-1`                 | `-1`
Number        | `1e3`                | `1e3`
String        | `"hello"`            | `hello`
String        | `"hello world"`      | `'hello world'`
String        | `"10"`               | `-- 10`
String        | `"-10"`              | `-- -10`
String        | `"-"`                | `-- -`
String        | `"--"`               | `-- --`
True          | `true`               | `-t`
False         | `false`              | `-f`
Null          | `null`               | `-n`

SHON subexpressions can be interpolated with a bare `$SHON` variable.

```console
$ ARRAY='[ 1 2 3 ]'
$ npx shon [ --array $ARRAY ]
{"array":[1,2,3]}
```

To safely interpolate an arbitrary string, use `-- "$VARIABLE"`.
This ensures that the variable is interpreted as a string literal in place,
even if it begins with `-` or `--`.

```bash
$ STRING='-rf /'
$ npx shon [ --string -- "$STRING" ]
{"string":"-rf /"}
```

- [SHON in JavaScript](https://www.npmjs.com/package/shon)
- [SHON in Go](https://github.com/abhinav/shon-go)
- [SHON Playground](https://abhinav.github.io/shon-go/playground/)
- Of course, you should just use `jq`, as illustrated in [JISH](/jish/#echo).

[Abhinav Gupta](https://abhinavg.net/) contrived the name SHON, which is much
better than _JSON and the Arguments_.
