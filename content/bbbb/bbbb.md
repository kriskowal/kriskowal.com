---
title: Basic Binary Board Book
layout: layouts/post.njk
tags:
- home
- posts
- Baby Book
date: 2025-04-06
---

The
[Basic Binary Board Book](https://www.patreon.com/kriskowal/shop/babys-basic-binary-board-book-1424682)
is for small people who aspire to one day count in binary from 0 to F.
I am not yet selling physical copies, but the
[PDF](https://www.patreon.com/kriskowal/shop/babys-basic-binary-board-book-1424682)
is cheap and
[*Pint Size Productions*](https://customboardbooks.pintsizeproductions.com/product/Kris-Kowal-16-Page-Board-Book)
can print one out for you on demand and ships within the United States.
We produced a [monochrome first edition](/bbbb/2020/) for our first child.
This colorful second edition with more information commemorates our second.
It looks like this interactive version.

<iframe name="computer" src="/bbbb/f.html" scrolling="no" style="position: sticky; position: -webkit-sticky; top: 10px; padding: 0; margin: 0; left: calc(50% - min(25vh, 50%)); width: calc(min(50vh, 100%)); aspect-ratio: 616.80365 / 566.70001; overflow: hidden; border: dotted 1px black; border-radius: 30px; background-color: white"></iframe>

What follows is an explanation for parents and lifelong learners.

# Digits

The word <strong>digit</strong> has accumulated a lot of meanings.
On the one hand, digit means finger.
With the other hand, there are 10 digits.
The hands of a clock point to numbers from 1 to 12.
The hand of a compass points to numbers from 0 to 359.
Although computers don’t have hands, nothing could be more digital.
So, a robot is all kinds of handy.

In a <strong>decimal</strong> number, each digit is a number from 0 to 9.
The last digit counts for one, and each digit represents 10 times as much as
the one to its right.
So, if you multiply each digit by its <strong>place value</strong>
and add those numbers up, that is the value of the whole number.

> 123   
> 1⨉100 + 2⨉10 + 3⨉1    
> 300 + 20 + 1

All of the wonderous utility and complexity of expression and communication
facilitated by computers emerges from the stark reality that a computer is a
very long list of switches that can flip themselves very, very quickly.
And each of those switches is a digit in the <strong>binary</strong> number
system.

The computer above has has <strong>four</strong> binary digits or
<strong>bits</strong>.
Whenever you flip a switch, you change the number.
You can touch or click a bit on this computer to <strong>toggle</strong>.

So, if you take the number <a href="/bbbb/0.html" target="computer">zero</a>
and click or touch the center of the circle or the last bit of `0b0000`,
it will turn to page <a href="/bbbb/1.html" target="computer">1</a>.
If you then click or touch the next ring, with two segments, the number
will turn to <a href="/bbbb/3.html" target="computer">three</a>, which has
both of the <strong>least significant bits</strong>.
If you turn off the center bit again, you go back down to <a
href="/bbbb/2.html">two</a>.

When a switch is off, it represents the binary digit <strong>zero</strong>.
When a switch is on, it represents the binary digit <strong>one</strong>.
These are the only digits in binary.

# Concentric rings

On each of the pages of this binary book, there are four concentric rings,
each representing a bit of a four digit number.
The color of the ring and the number of segments in the ring represents its
<strong>place value</strong>.
So, the outer ring has <a href="/bbbb/8.html" target="computer">eight</a> segments.
The next ring has <a href="/bbbb/4.html" target="computer">four</a>.
The next ring has <a href="/bbbb/2.html" target="computer">two</a>.
The innermost ring is simply a circle with <a href="/bbbb/1.html"
target="computer">one</a> segment.
Each segment has the same area, so should give you a visual sense for the
doubling in value from inside to out and the total value of each number.

# Binary numerals

Numbering systems like binary and decimal encode the number of expressible
digits in their name.
The <strong>bi-</strong> in binary means <strong>two</strong>.
The <strong>dec-</strong> in decimal means <strong>ten</strong>.
The <strong>hexadec-</strong> in hexadecimal means <strong>sixteen</strong>.
(The <strong>dodec-</strong> in dodecimal means <strong>twelve</strong>,
but so does the <strong>dozen</strong> in <strong>dozenal</strong>, and that's
more fun.
The <strong>sexages-</strong> in sexagesimal means <strong>sixty</strong>.)

As with decimal, the last bit of a binary number stands for the value of one.
The <strong>place value</strong> of ever other bit is twice as much
as the bit to its right.

So, each switch, when on, stands for <strong style="color: rgb(0, 130,
154)">eight</strong>, <strong style="color: rgb(211, 0, 210)">four</strong>,
<strong style="color: rgb(0, 139, 14)">two</strong>, and <strong style="color:
rgb(175, 101, 0)">one</strong> respectively.
Adding them up, as illustrated on top of the computer, produces
the decimal sum on the top-left corner.

So, with four bits, we can represent the <strong>sixteen</strong> numbers: 0,
1, 10, 11, 100, 101, 110, 111, 1000, 1001, 1010, 1011, 1100, 1101, 1110, and
1111.
To help distinguish these from decimal numbers, we add a `0b`.
The initial `0` indicates that the word that follows is a number and not a
name.  The `b` stands for binary.

When people discuss numbers that fit nicely in computers, writing all the
bits out is sometimes illustrative, but writing out four digits for numbers
from 0 to 15 is tedious, and writing the same numbers in decimal sometimes
requires one digit (like 7) and sometimes two (like 12).

Every four-bit number in binary corresponds to a single digit in
<strong>hexadecimal</strong>.
For the numbers from zero to nine, we reuse the decimal digits 0 to 9.
But for the numbers ten to fifteen, we use the letters from A to F.

In the same way we use the `0b` prefix for binary numbers, in hexadecimal
notation, we use the prefix `0x`.
So, hexadecimal `0xA` means binary `0b1010` and decimal `10`.

> 0xA in hexadecimal  
> 0b1010 in binary  
> 10 in decimal  

# Hexadecimal numerals

The hexadecimal notation captures an even number of binary digits in a
much-compressed form, but not so compressed that humans must memorize the
values of many more than the traditional base-ten digits.

The memory of a computer is a long, long list of metaphorical switches.
The computer has various tiers of memory and can move chunks of memory between
those tiers.
The smallest and fastest tier has <strong>registers</strong> and the smallest
addressable registers on modern computers converged on having eight bits, which
we call a <strong>byte</strong>.
So, when we draw a representation of a byte in hexadecimal, it has two
hexadecimal digits: the <strong>high nibble</strong> and the <strong>low
nibble</strong>.
I would have spelled that <strong>nybble</strong>, but nobody asked me.
In fairness, I didn't exist yet.

The hexadecimal digits are
<a href="/bbbb/0.html" target="computer">0</a>,
<a href="/bbbb/1.html" target="computer">1</a>,
<a href="/bbbb/2.html" target="computer">2</a>,
<a href="/bbbb/3.html" target="computer">3</a>,
<a href="/bbbb/4.html" target="computer">4</a>,
<a href="/bbbb/5.html" target="computer">5</a>,
<a href="/bbbb/6.html" target="computer">6</a>,
<a href="/bbbb/7.html" target="computer">7</a>,
<a href="/bbbb/8.html" target="computer">8</a>,
<a href="/bbbb/9.html" target="computer">9</a>,
<a href="/bbbb/a.html" target="computer">A</a>,
<a href="/bbbb/b.html" target="computer">B</a>,
<a href="/bbbb/c.html" target="computer">C</a>,
<a href="/bbbb/d.html" target="computer">D</a>,
<a href="/bbbb/e.html" target="computer">E</a>, and
<a href="/bbbb/f.html" target="computer">F</a>.
So, the largest expressible number in a byte is 255 and we write that as
`0xFF`.

# Of bucks and bytes

By dint of a strange coïncidence, the word “bit” means an eighth of a byte and
also an eighth of a dollar.
The word dollar comes from Spanish, and the Spanish got the word from
a specific silver mine in a town of modern Czechia called Joachimsthal, or
Saint Joachim’s Dale.
So, the German “thal” means valley, is also seen in “neanderthal”, and gave
English both the word “dale” and “dollar”.

The silver dollar also gave Spanish pesos de ocho, or pieces of eight, which
were slices of the dollar coin.
Americans of the Victorian era called these bits, so a “two-bit saloon”
costed twenty-five cents.

Thus, there are eight bits to the dollar.
The other <em>coining</em> of bit was for parts of a byte,
but long before there was agreement that a byte should have eight bits.
Many other word lengths existed.

# Counting

In the binary book, you can add one to a number by turning the page.
In the computer based on that book above, the “`>`” button increments and
“`<`” decrements.
If you count from 0 to F, you will notice that the inside circle, representing
the <strong>least significant bit</strong> flips on and off.
When a bit flips off, the value of the bit must be <strong>carried</strong> up
to the next ring or next most significant bit.
Carrying bits ripples up until it flips a switch from off to on.

A strange thing happens when the four bit number runs out of bits.
When you go to the next page from <a href="/bbbb/f.html" target="computer">fifteen</a>,
you return to <a href="/bbbb/0.html" target="computer">zero</a>.
This phenomenon is called overflow, and although its a sharp departure from
mathematics, it is eminently useful for computers because integer addition can
use the exact same circuitry as subtraction.

# Hexadecimal pronunciation

In 2019, [Liz Henry](https://en.wikipedia.org/wiki/Liz_Henry) unearthed an
article titled <em>A Hexadecimal Pronunciation Guide</em> from <em>Datamation
Magazine, Volume 14</em> by Robert A. Magnusen in 1968.
This long-lost naming scheme was both sensible and rife with puns.

Magnusen proposed that the numbers <a href="/bbbb/a.html" target="computer">10</a> to
<a href="/bbbb/f.html" target="computer">15</a> be named <strong>anna</strong>, bet,
<strong>chris</strong>, <strong>dot</strong>, <strong>ernest</strong>, and
<strong>frost</strong>.  It naturally follows that 0xB0 is
<strong>betty</strong> and 0x1C is <strong>christeen</strong>.

[{% image "magnusen.jpg", "a page from Datamation magazine with a sample of Magnusen's pronunciation guide for hexadecimal" %}](/bbbb/magnusen-large.jpg)

So, `0xB0B5_C0FFEE_FACADE` is pronounced, “betty, betty-five, christy,
frosty-frost, ernesty-ernest, frosty-anna, christy-anna, dotty-ernest”.

# Latin and Greek

This book also notes the Latin and Greek roots for English numbers,
which you will see in the names of number systems and geometric shapes.

English uses Latin roots to construct all sorts of English words.
We’ve already visited names of number systems, like <strong>binary</strong>.
You can use these roots to name arbitrary number systems, like <strong>quaternary</strong>.
They also make words like <strong>octagon</strong> and <strong>triangle</strong>

* <a href="/bbbb/0.html" target="computer">null</a>,
* <a href="/bbbb/1.html" target="computer">un-</a>,
* <a href="/bbbb/2.html" target="computer">bi-</a>,
* <a href="/bbbb/3.html" target="computer">tres-</a>,
* <a href="/bbbb/4.html" target="computer">quad-, quat-</a>,
* <a href="/bbbb/5.html" target="computer">quint-</a>, <em>&</em>
* <em>cetera</em>

English uses the Greek roots for words like <strong>monochrome</strong> for <a
href="/bbbb/1.html" target="computer">one</a> color, <strong>pentagon</strong> for a
shape with <a href="/bbbb/5.html" target="computer">five</a> sides and
<strong>tesseract</strong>, a shape with <a href="/bbbb/4.html"
target="computer">four</a> dimensions.

* <a href="/bbbb/0.html" target="computer">null</a>,
* <a href="/bbbb/1.html" target="computer">un-</a>,
* <a href="/bbbb/2.html" target="computer">bi-</a>,
* <a href="/bbbb/3.html" target="computer">tres-</a>,
* <a href="/bbbb/4.html" target="computer">quad-, quat-</a>,
* <a href="/bbbb/5.html" target="computer">quint-</a>, <em>kai</em>
* <em>ta loipa</em>

English uses these roots in all manner of inconsistent and nonsensical ways
that are never-the-less broadly accepted, like <strong>nonagon</strong>
instead of <strong>enneagon</strong>, using a Latin root for 9-sided shapes
although every other <em>n</em>-gon is named according to Greek roots.
We have Greek <strong>double</strong> and <strong>triple</strong>,
but Latin <strong>single</strong> and <strong>quadruple</strong>.

Etymology is the fossil record of confusion.

# Roman numerals

The pages of this book do not speak about [Tally
Marks](https://en.wikipedia.org/wiki/Tally_marks), the only number system
simpler than binary, especially since <strong>simple</strong> is related to
<strong>single</strong> and literally based on <strong>one</strong>, one less
than two.

For no other reason that to set up for the next joke,
this book catalogues the [Roman Numerals](https://en.wikipedia.org/wiki/Roman_numerals).
This is a decimal numeral system whose only apparent virtue is that it can be
etched with an economy of strokes using a stylus.

# Binary Roman numerals

The Roman numerals employ the letters I, V, and X.
I propose new values for these glyphs, in ascending complexity, and introduce
the next obvious symbol for the representation of binary numbers.

* `I` for 1
* `V` for 2
* `X` for 4
* `#` for 8

The last is sometimes called <strong>octothorpe</strong>, which has the virtue
of never confusing British bean counters or American weights and measures.
It also suggests that X is a <strong>quadrathorpe</strong>.
V is arguably a <strong>bithorpe</strong> and I an <strong>unthorpe</strong>,
but I will concede that this is a stretch.
It can be much more convincingly argued that - is a bithorpe, ⨉ is a
quadrathorpe, and asterisk * is a hexathorpe.
A simple thorpe is a thing of myth and legend.

Regardless, it follows that Binary Roman numerals represent a four-bit binary
number as a sequence of #XVI, including only the bits that are set, so their
value is a mere counting of thorpes.

The binary numerals are:

* <a href="/bbbb/0.html" target="computer">&nbsp;</a>
* <a href="/bbbb/1.html" target="computer">I</a>
* <a href="/bbbb/2.html" target="computer">V</a>
* <a href="/bbbb/3.html" target="computer">VI</a>
* <a href="/bbbb/4.html" target="computer">X</a>
* <a href="/bbbb/5.html" target="computer">XI</a>
* <a href="/bbbb/6.html" target="computer">XV</a>
* <a href="/bbbb/7.html" target="computer">XVI</a>
* <a href="/bbbb/8.html" target="computer">#</a>
* <a href="/bbbb/9.html" target="computer">#I</a>
* <a href="/bbbb/a.html" target="computer">#V</a>
* <a href="/bbbb/b.html" target="computer">#VI</a>
* <a href="/bbbb/c.html" target="computer">#X</a>
* <a href="/bbbb/d.html" target="computer">#XI</a>
* <a href="/bbbb/e.html" target="computer">#XV</a>
* <a href="/bbbb/f.html" target="computer">#XVI</a>

This representation highlights property unique to binary numerals.
Because the only possible values of a digit are 0 or 1, the ommission of a
digit can imply 0.
This is not a book about how computers represent real numbers, but computers
use at least one practical application of this insight.
If you were to create a <strong>scientific notation</strong> out of binary
digits, the only number that doesn't start with 1 is 0.
So, that first 1 can be implied and doesn't require a switch.

# Basic binary board book

If you have gotten this far, you probably already received a copy of [<em>Basic
Binary Board
Book</em>](https://www.patreon.com/kriskowal/shop/babys-basic-binary-board-book-1424682),
either because your child received it as a birthday present, or you lost at a
White Elephant gift exchange.

But, I would be remiss if not to remind you that you have an opportunity to buy
one for yourself, your child, and all their peers at the preschool or
gradschool.
I am not yet selling physical copies, but the
[PDF](https://www.patreon.com/kriskowal/shop/babys-basic-binary-board-book-1424682)
is cheap and
[*Pint Size Productions*](https://customboardbooks.pintsizeproductions.com/product/Kris-Kowal-16-Page-Board-Book)
can print one out for you on demand and ships within the United States.

