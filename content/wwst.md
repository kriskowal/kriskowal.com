---
title: Weight Watching Splay Trees
layout: layouts/post.njk
tags:
- posts
also:
- slugs/bbbb.html
date: 2012-07-27
---

This article is a place holder.
I, at some point, must find some time to tell you all about a useful
complication to the Sleater-Tarjan splay tree that allows the collection to
emit the same change events (added value at index or removed value at index) as
the equivalent sorted array, but without the cost of shifting a very large
array.

A splay tree can only modify the root node, so both inserting and deleting a
value from a splay tree begins by rotating the tree until the node of interest
is at the root.

The premise of this complication is that the equivalent index for any node in a
splay tree is the total number of nodes in the left subtree, when that node is
at the root of the tree.

Sleater-Tarjan does not incrementally track the weight of every subtree,
but can do so trivially, except that it must track its path through the tree
and roll up the incremental weight changes on the way out.

This deserves an explanation with diagrams, but for now and possibly for
eternity, [the code will have to suffice](https://github.com/kriskowal/collections/blob/c7855495a4c89a5c077533ba3e58a218f982f0a6/packages/sorted-set/sorted-set.js#L325-L445).
