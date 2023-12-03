---
title: Harmony
layout: layouts/post.njk
tags:
- home
date: 2011-05-10
---

The following data overlays pitches in equal temperament (a piano tuned to be
equally out of tune regardless of which key you use as the root of your chords,
the fundamental), against frequencies that are harmonics of the fundamental.

Harmonics that are closer to the left will tend to be more pleasing to the ear
(consonant, as opposed to dissonant). Every time you overlay two frequencies,
it produces a third frequency: an overtone or undertone depending on whether it
is above or below the primary tones. Dissonance occurs when an overtone soars
toward the upper end of the spectrum of perceptible frequencies (around 20KHz),
or rumbles low, close to the bottom end of the perceptible spectrum (around
16Hz).

```
       A - 440   Hz Do
   64/63   447.0 Hz                                                                | 64/63
   33/32   453.8 Hz                                  | 33/32
   32/31   454.2 Hz                                | 32/31
   64/61   461.6 Hz                                                              | 64/61
 A#/Bb/H - 466   Hz 
   17/16   467.5 Hz                  | 17/16
   16/15   469.3 Hz                | 16/15
   64/59   477.3 Hz                                                            | 64/59
   35/32   481.2 Hz                                    | 35/32
   32/29   485.5 Hz                              | 32/29
       B - 493   Hz Re
   64/57   494.0 Hz                                                          | 64/57
     9/8   495.0 Hz          | 9/8
     8/7   502.9 Hz        | 8/7
   37/32   508.8 Hz                                      | 37/32
   64/55   512.0 Hz                                                        | 64/55
   32/27   521.5 Hz                            | 32/27
   19/16   522.5 Hz                    | 19/16
       C - 523   Hz Me
   64/53   531.3 Hz                                                      | 64/53
   39/32   536.2 Hz                                        | 39/32
   16/13   541.5 Hz              | 16/13
     5/4   550.0 Hz      | 5/4
   64/51   552.2 Hz                                                    | 64/51
   C#/Db - 554   Hz Mi
   32/25   563.2 Hz                          | 32/25
   41/32   563.8 Hz                                          | 41/32
   64/49   574.7 Hz                                                  | 64/49
   21/16   577.5 Hz                      | 21/16
     4/3   586.7 Hz    | 4/3
       D - 587   Hz Fa
   43/32   591.2 Hz                                            | 43/32
   64/47   599.1 Hz                                                | 64/47
    11/8   605.0 Hz            | 11/8
   32/23   612.2 Hz                        | 32/23
   45/32   618.8 Hz                                              | 45/32
   D#/Eb - 622   Hz 
   64/45   625.8 Hz                                              | 64/45
   23/16   632.5 Hz                        | 23/16
   16/11   640.0 Hz            | 16/11
   47/32   646.2 Hz                                                | 47/32
   64/43   654.9 Hz                                            | 64/43
       E - 659   Hz So
     3/2   660.0 Hz    | 3/2
   32/21   670.5 Hz                      | 32/21
   49/32   673.8 Hz                                                  | 49/32
   64/41   686.8 Hz                                          | 64/41
   25/16   687.5 Hz                          | 25/16
       F - 698   Hz Le
   51/32   701.2 Hz                                                    | 51/32
     8/5   704.0 Hz      | 8/5
    13/8   715.0 Hz              | 13/8
   64/39   722.1 Hz                                        | 64/39
   53/32   728.8 Hz                                                      | 53/32
   F#/Gb - 739   Hz La
   32/19   741.1 Hz                    | 32/19
   27/16   742.5 Hz                            | 27/16
   55/32   756.2 Hz                                                        | 55/32
   64/37   761.1 Hz                                      | 64/37
     7/4   770.0 Hz        | 7/4
    16/9   782.2 Hz          | 16/9
   57/32   783.8 Hz                                                          | 57/32
       G - 783   Hz Te
   29/16   797.5 Hz                              | 29/16
   64/35   804.6 Hz                                    | 64/35
   59/32   811.2 Hz                                                            | 59/32
    15/8   825.0 Hz                | 15/8
   32/17   828.2 Hz                  | 32/17
   G#/Ab - 830   Hz Ti
   61/32   838.8 Hz                                                              | 61/32
   31/16   852.5 Hz                                | 31/16
   64/33   853.3 Hz                                  | 64/33
   63/32   866.2 Hz                                                                | 63/32
       A - 880   Hz Do
```

This program generates the above table.

```python
# fundamental frequency, in this case A4 in the middle of the piano
F = 440.0

depth = 64

encountered = set([440.0, 880.0])
pythagorean = set()

# overtones
for n in range(1, depth):
    m = 1
    while float(n) / float(m) > 2.0:
        m = m * 2
    f = F * n / m
    if n == m:
        continue
    if f in encountered:
        continue
    encountered.add(f)
    pythagorean.add((f, n, m, n))

# undertones
for m in range(1, depth):
    n = 1
    while float(n) / float(m) < 1.0:
        n = n * 2
    f = F * n / m
    if n == m:
        continue
    if f in encountered:
        continue
    encountered.add(f)
    pythagorean.add((f, n, m, m))

pythagorean = sorted(pythagorean)

names = [
    ('A', 'Do'),
    ('A#/Bb/H', ''),
    ('B', 'Re'),
    ('C', 'Me'),
    ('C#/Db', 'Mi'),
    ('D', 'Fa'),
    ('D#/Eb', ''),
    ('E', 'So'),
    ('F', 'Le'),
    ('F#/Gb', 'La'),
    ('G', 'Te'),
    ('G#/Ab', 'Ti'),
]
for note in range(13):
    f = F * 2.0 ** (note / 12.0)
    g = F * 2.0 ** ((note + 1) / 12.0)

    name, interval = names[note%12]
    print '%8s - %d   Hz %s' % (name, f, interval)
    for h, n, m, d in pythagorean:
        if f < h and h <= g:
            print '%8s   %0.1f Hz %s| %s' % ('%d/%d' % (n, m), h, ' ' * d, '%d/%d' % (n, m))
```

The first time I wrote this program, I was in high school.
I found this near the innermost drive of my matryoshka archive.

```basic
FOR a = 0 TO 120

  LET b = a
  LET o = 0

  DO UNTIL b < 12
    LET b = b - 12
    LET o = o + 1
  LOOP

  DO UNTIL b >= 0
    LET b = b + 12
    LET o = o - 1
  LOOP

  IF b = 0 THEN LET c$ = "Bb A#"
  IF b = 1 THEN LET c$ = "B  B "
  IF b = 2 THEN LET c$ = "C  C "
  IF b = 3 THEN LET c$ = "Db C#"
  IF b = 4 THEN LET c$ = "D  D "
  IF b = 5 THEN LET c$ = "Eb D#"
  IF b = 6 THEN LET c$ = "E  E "
  IF b = 7 THEN LET c$ = "F  F "
  IF b = 8 THEN LET c$ = "Gb F#"
  IF b = 9 THEN LET c$ = "G  G "
  IF b = 10 THEN LET c$ = "Ab G#"
  IF b = 11 THEN LET c$ = "A  A "

  LET d = a / 12
  LET e = (1 / 2) ^ d

  LET f = 14 - LEN(STR$(d))

  LPRINT c$ + " octave" + STR$(o) + ",     line:" + STR$(d) + "," + SPACE$(f) + "quad:" + STR$(e)

NEXT
```
