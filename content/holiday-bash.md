---
title: Holiday Bash
layout: layouts/post.njk
tags:
- Yuletide
- Art
- posts
date: 2008-12-12
---

I'll be holding a little party at my terminal for the holidays.  Please join me by running the following command in your shell.

```sh
((while true; do echo -en "\033[31m." >&2; echo; done) \
| (while read line; do echo -en "\033[32m."; done))
```


