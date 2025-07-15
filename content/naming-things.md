---
title: Naming Things
layout: layouts/post.njk
tags:
- posts
- Programming
- Software Design
date: 2025-07-14
---

There are famously [two hard things in computer
science](https://martinfowler.com/bliki/TwoHardThings.html): cache
invalidation, naming things, and off-by-one errors.

Arguably, naming things is the hardest because there's an _element_ of
subjectivity.
Cache invalidation is hard because of complexity, but at least incoherence
is objectively measurable.
Off-by-one errors are as easy to fix as they are to make, only hard to reliably
avoid.
However, there are infinite tensions in naming.

On the one hand, you can make a program work with nearly any choice of name.
On the other, no great program consists of entirely arbitrary names.

Every name is eventually regretable.
But, take heart because those who practice naming do get better at postponing
that regret.
And, dispair, for those who don't practice naming choose a lot of regretable
names.

Here are some things I know about naming.
First, don't settle for a name that works.
Let the problem bother you for a bit.

# The Three Laws of Naming in Computer Science

The **Three Laws of Naming in Computer Science** are,

0. The name must describe the thing.
1. The name will ideally describe no other thing.
2. The name is among the shortest of all concise names, and no shorter.
3. The name is the funniest of short, concise names.

Corollary: Abbreviations are inevitably ambiguous.
Don’t make me guess whether or how you abbreviated or contracted a name, or if
you elided every other vowel.
Do not make me guess.

Also, names do not appear in isolation.
The best names participate in systems of names.

# The Laws of Systems of Names in Computer Science

The **Laws of Systems of Names in Computer Science** are,

1. Every public name establishes a precedent and can thereafter never change.
   **Choose wisely.**

2. A system of names must not contain any synonyms.
   **Choose one.**

3. If the name of a thing has an antonym or dual, a thing with the other name
   should exist and have the implied relationship.
   **Choose coherently.**

That is, don't name something `kiki` unless you know what would be `bouba`.
If something is named `up`, there should be a `down`.
If clockwise is `deosil`, then counter-clockwise is `widdershins`.
If you need one dimension, `left` and `right` will do; whereas if you need
two dimensions, `north`, `east`, `south`, and `west` are there for you.

If you have a bunch of shapes like `hexagon`, `septagon`, and `octogon`,
so help me, the next one better be an
[`enneagon`](https://en.wikipedia.org/wiki/Nonagon).
Nonagon does not belong in the company of Greeks.
Also, triangles are trigons.
Don’t get me started.

Your language or its standard library has chosen many names already and
you are obligated to choose names that are coherent with the body
of established precedent.

Do not mix metaphors.
The inverse of `install` is `uninstall`.
The inverse of `add` is `remove` or `delete`, and that precedent has almost
certainly been set.

I will personally haunt you if you cross `begin` with `finish`.
The opposite of `begin` is `end`.
The opposite of `start` is `finish`.

# Kay's Aphorism

> Similar things should be the same or different.
> — Alan Kay

I have had the pleasure of working with [Mark S.
Miller](https://en.wikipedia.org/wiki/Mark_S._Miller) who in turn had the
pleasure of working with [Alan Kay](https://en.wikipedia.org/wiki/Alan_Kay) so
occasionally remembers things people have said that may never have been written
down.

You might be tempted to use `begin` and `end` for nouns and `start` with
`finish` for verbs.
These are not different enough to be distinct.
I recommend choosing one of these pairs for nouns and use an entirely
different group for verbs.
The tape deck metaphor would give you `replay` and `skip` and provide
verbs like `play`, `pause`, and `seek` if you ever need them.

There are precedents across language boundaries for using the words `promise`,
`future`, and `deferred` to variously refer to similar devices.
Use the prevailing convention, but if there isn’t a precedent, pick one.
But, if you need another similar thing, pick a different word entirely
that captures the distinction, like `signal` or `observable`.

It is _sometimes_ okay to beg a fine distinction between groups of words
or to make arbitrary choices about how these words are grouped.
There are cases where we need more words than there are distinct meanings.

So, if you find you need two flavors of ends…

# On Deque

Two awful programming languages adopted `push`, `pop`, `shift`, and `unshift`
for the deque methods.
That makes it a Schelling Point and no other choices are valid going forward
unto forever.
If you make a new language with deque-like protocols and don't choose these
exact names, you have failed in your duty to coddle your fledgling base.

But, hear me out.
What if there were a reliable mnemnoic you could use to distinguish
whether the method operated on the <b>I</b> (input) side or the <b>O</b>
(output) side?
What if you could do this without straying very far from an English dictionary?
What if you can do this with pithy monosyllables?

As it happens, `tip` and `top` both mean _end_ and you could argue that their
middle letter indicates which end value they will report.
Likewise, `pip` and `pop` are very ordinary words, and while `pip` might
require a stretch, `pop` is already accepted as the correct name in both Perl
and JavaScript for removing a value from the output end of a queue.
If you have ever heard the idiom “pish posh”, you can easily remember
which end these methods will push onto.
And, if you ever need to rotate your dequeue, you might consider `shift` and
`shoft`.

- **in** / **out**
- `tip` / `top` (peek at the value at an end, without mutation)
- `pip` / `pop` (remove a value at an end and return it)
- `pish` / `posh` (add a value to an end)
- `shift` / `shoft` (rotate a value from one end to the other, or move a cursor
  around a circular linked list forward or backward)

But, seriously, go with `push`, `pop`, `shift`, and `unshift`.

# Of Trees and Tries

I don't want to talk about this.
Mistakes were made.
Skip to prefix trees and forget about it.

But, if you're going to be mean about it, I’m going to continue pronouncing the
G in GIF as if I were Dutch and the Ph in JPEG like “photograph”.
Bake some ambiguity into your name's pronunciation and I'll find the third
interpretation and socialize it at your favorite conference.

# Brand Names

Brand names do not follow the laws of naming things in computer science.
You will probably have to resort to ten indecent tricks to find a name that is
available and memorable.
You may name your project with a brand name.
Your project must have exactly one brand name.
You must not create a system of brand names inside your project.
The brand name must not invade your project's interfaces, protocols, or
properties.

So, for example, if your project is named `fx`, you might even consider
naming its main class `Effect`, but do so at your peril if it does not
correspond to anything that might follow from a cause.

For example, suppose you are choosing the conventional name where a tool
might install vendored dependencies, regardless of whether they're
using the tool with your very specific brand name.
That directory name is obviously `dependencies`.
A bad name for this would be `bun_modules`.

# Pick One Case Convention

Nobody wants to guess which case convention you used.
Choose one throughout your project.

Your convention may differentiate files, languages, public versus private, code
names, and classes versus instances.
But, if a single directory has file names with different conventions: shame.
If a single file name uses more than one delimiter: exile.

These are all available options:

- `kebab-case`
- `snake_case`
- `SCREAMING_CASE`
- `dromedaryCase`
- `BactrianCase`

Camel case is ambiguous.
Be specific.

Avoid `runoncase`.
You will, in the fullness of time, encounter real combinations of terms with
meaningful semanticic differences depending on the place of the invisible
delimiter.
For example, `beans-owing` versus `bean-sowing` is a very real example.

Notably, Golang sets a strong precedent for `runoncase` for package names.
The precedent is stronger than this rule.
But, you can trivially avoid names with undelimited terms, either by using
single words, or vestigial intermediate directories.

This is not arguable: if a file name might appear in an HTTP request, that name
is in kebab-case.
That includes any JavaScript module specifier.
I am looking at you `node:child_process`.
`node:popen` was right there and you know it.

Many languages have a prevailing convention.
Just follow it.

A name may consist of one or more terms.
Those terms may themselves be initialisms and acronyms.
Case conventions like `dromedaryCase` and `BactrianCase`
use capitalization to indicate the boundary between terms.
You must only, ever capitalize the first letter of an initialism
in either of these case conventions.
And, in fact, you must never vary caplitalization in any
of the other case conventions.
Mark my words, `XMLHttpRequest` was a mistake we must never
repeat.

- `xml-http-request`
- `xml_http_request`
- `XML_HTTP_REQUEST`
- `xmlHttpRequest`
- `XmlHttpRequest`

Accept no alternatives.

Some terms may be numbers.
You have my express permission to use an `_` to separate any pair of numbers
that happen to run into each other.
For example, `v1_2_3`.

# Identifer

If you follow the inviolable laws above, regardless of whether you believe that ID
is somehow an initialism for “identifier” (it’s not), you will be compelled
to spell it as `Id` in `BactrianCase`.
I am aware that you find this distasteful.
Let’s agree not to have this argument.
Identifier is spelled “identifier”.

# Get

The verb `get` implies that a function is read-only and has no _observable,
semantic_ side effects.
Do not break this expectation.
The get methods of splay trees may cause internal mutation that affects
the timing of subsequent operations, but these side effects fall under
the _observable_ or _semantic_ exceptions to the rule.

But, if the `get` qualifier does nothing to change the meaning of a compound
name, and if you are not writing in a sysem with a strong prevailing convention
for `get` methods like Java, sometimes `get` just makes a name longer than
necessary.
Prefer `length` over `getLength`, especially if you have the option
of making it a computed property.

The dual of `get` is `set`.
Accept no substitutes.

# And so on

Consider this a living document.
Come again soon.
