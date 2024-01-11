---
title: Harmony
layout: layouts/post.njk
tags:
- posts
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

The program below generates the above chart.

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
I found this table and the subsequent program near the innermost drive of my
matryoshka archive.
This produces a practical guide for how much you would have to bend a harmonic
to match the note in equal temperament, this time with a C as the fundamental
frequency.

| Wavelength | Note | Equiv | Error |
| -------- | ---- | ----- | ----- |
| 1/1  | C | C  |  |
| 1/2  | C | C  |  |
| 1/3  | G | G  |  1 cent(s) flat |
| 1/4  | C | C  |  |
| 1/5  | E | E  |  13 cent(s) sharp |
| 1/6  | G | G  |  1 cent(s) flat |
| 1/7  | Bb | A# |  30 cent(s) sharp |
| 1/8  | C | C  |  |
| 1/9  | D | D  |  3 cent(s) flat |
| 1/10 | E | E  |  13 cent(s) sharp |
| 1/11 | Gb | F# |  47 cent(s) sharp |
| 1/12 | G | G  |  1 cent(s) flat |
| 1/13 | Ab | G# |  38 cent(s) flat |
| 1/14 | Bb | A# |  30 cent(s) sharp |
| 1/15 | B | B  |  11 cent(s) sharp |
| 1/16 | C | C  |  |
| 1/17 | Db | C# |  4 cent(s) flat |
| 1/18 | D | D  |  3 cent(s) flat |
| 1/19 | Eb | D# |  2 cent(s) sharp |
| 1/20 | E | E  |  13 cent(s) sharp |
| 1/21 | F | F  |  28 cent(s) sharp |
| 1/22 | Gb | F# |  47 cent(s) sharp |
| 1/23 | Gb | F# |  27 cent(s) flat |
| 1/24 | G | G  |  1 cent(s) flat |
| 1/25 | Ab | G# |  26 cent(s) sharp |
| 1/26 | Ab | G# |  38 cent(s) flat |
| 1/27 | A | A |  5 cent(s) flat |
| 1/28 | Bb | A# |  30 cent(s) sharp |
| 1/29 | Bb | A# |  28 cent(s) flat |
| 1/30 | B | B  |  11 cent(s) sharp |
| 1/31 | B | B  |  43 cent(s) flat |
| 1/32 | C | C  |  |
| 1/33 | Db | C# |  46 cent(s) sharp |
| 1/34 | Db | C# |  4 cent(s) flat |
| 1/35 | D | D  |  44 cent(s) sharp |
| 1/36 | D | D  |  3 cent(s) flat |
| 1/37 | Eb | D# |  47 cent(s) sharp |
| 1/38 | Eb | D# |  2 cent(s) sharp |
| 1/39 | Eb | D# |  40 cent(s) flat |
| 1/40 | E | E  |  13 cent(s) sharp |
| 1/41 | E | E  |  27 cent(s) flat |
| 1/42 | F | F  |  28 cent(s) sharp |
| 1/43 | F | F  |  11 cent(s) flat |
| 1/44 | Gb | F# |  47 cent(s) sharp |
| 1/45 | Gb | F# |  9 cent(s) sharp |
| 1/46 | Gb | F# |  27 cent(s) flat |
| 1/47 | G | G  |  33 cent(s) sharp |
| 1/48 | G | G  |  1 cent(s) flat |
| 1/49 | G | G  |  36 cent(s) flat |
| 1/50 | Ab | G# |  26 cent(s) sharp |
| 1/51 | Ab | G# |  6 cent(s) flat |
| 1/52 | Ab | G# |  38 cent(s) flat |
| 1/53 | A | A |  25 cent(s) sharp |
| 1/54 | A | A |  5 cent(s) flat |
| 1/55 | A | A |  36 cent(s) flat |
| 1/56 | Bb | A# |  30 cent(s) sharp |
| 1/57 | Bb | A# |  0 cent(s) sharp |
| 1/58 | Bb | A# |  28 cent(s) flat |
| 1/59 | B | B  |  40 cent(s) sharp |
| 1/60 | B | B  |  11 cent(s) sharp |
| 1/61 | B | B  |  16 cent(s) flat |
| 1/62 | B | B  |  43 cent(s) flat |
| 1/63 | C | C  |  26 cent(s) sharp |
| 1/64 | C | C  |  |
| 1/65 | C | C  |  25 cent(s) flat |
| 1/66 | Db | C# |  46 cent(s) sharp |
| 1/67 | Db | C# |  20 cent(s) sharp |
| 1/68 | Db | C# |  4 cent(s) flat |
| 1/69 | Db | C# |  29 cent(s) flat |
| 1/70 | D | D  |  44 cent(s) sharp |
| 1/71 | D | D  |  19 cent(s) sharp |
| 1/72 | D | D  |  3 cent(s) flat |
| 1/73 | D | D  |  26 cent(s) flat |
| 1/74 | Eb | D# |  47 cent(s) sharp |
| 1/75 | Eb | D# |  24 cent(s) sharp |
| 1/76 | Eb | D# |  2 cent(s) sharp |
| 1/77 | Eb | D# |  19 cent(s) flat |
| 1/78 | Eb | D# |  40 cent(s) flat |
| 1/79 | E | E  |  34 cent(s) sharp |
| 1/80 | E | E  |  13 cent(s) sharp |
| 1/81 | E | E  |  7 cent(s) flat |
| 1/82 | E | E  |  27 cent(s) flat |
| 1/83 | F | F  |  49 cent(s) sharp |
| 1/84 | F | F  |  28 cent(s) sharp |
| 1/85 | F | F  |  8 cent(s) sharp |
| 1/86 | F | F  |  11 cent(s) flat |
| 1/87 | F | F  |  30 cent(s) flat |
| 1/88 | Gb | F# |  47 cent(s) sharp |
| 1/89 | Gb | F# |  28 cent(s) sharp |
| 1/90 | Gb | F# |  9 cent(s) sharp |
| 1/91 | Gb | F# |  9 cent(s) flat |
| 1/92 | Gb | F# |  27 cent(s) flat |
| 1/93 | Gb | F# |  45 cent(s) flat |
| 1/94 | G | G  |  33 cent(s) sharp |
| 1/95 | G | G  |  15 cent(s) sharp |
| 1/96 | G | G  |  1 cent(s) flat |
| 1/97 | G | G  |  19 cent(s) flat |
| 1/98 | G | G  |  36 cent(s) flat |
| 1/99 | Ab | G# |  44 cent(s) sharp |
| 1/100 | Ab | G# |  26 cent(s) sharp |
| 1/101 | Ab | G# |  9 cent(s) sharp |
| 1/102 | Ab | G# |  6 cent(s) flat |
| 1/103 | Ab | G# |  22 cent(s) flat |
| 1/104 | Ab | G# |  38 cent(s) flat |
| 1/105 | A | A |  42 cent(s) sharp |
| 1/106 | A | A |  25 cent(s) sharp |
| 1/107 | A | A |  9 cent(s) sharp |
| 1/108 | A | A |  5 cent(s) flat |
| 1/109 | A | A |  21 cent(s) flat |
| 1/110 | A | A |  36 cent(s) flat |
| 1/111 | Bb | A# |  45 cent(s) sharp |
| 1/112 | Bb | A# |  30 cent(s) sharp |
| 1/113 | Bb | A# |  15 cent(s) sharp |
| 1/114 | Bb | A# |  0 cent(s) sharp |
| 1/115 | Bb | A# |  14 cent(s) flat |
| 1/116 | Bb | A# |  28 cent(s) flat |
| 1/117 | Bb | A# |  42 cent(s) flat |
| 1/118 | B | B  |  40 cent(s) sharp |
| 1/119 | B | B  |  25 cent(s) sharp |
| 1/120 | B | B  |  11 cent(s) sharp |
| 1/121 | B | B  |  2 cent(s) flat |
| 1/122 | B | B  |  16 cent(s) flat |
| 1/123 | B | B  |  29 cent(s) flat |
| 1/124 | B | B  |  43 cent(s) flat |
| 1/125 | C | C  |  40 cent(s) sharp |
| 1/126 | C | C  |  26 cent(s) sharp |
| 1/127 | C | C  |  13 cent(s) sharp |
| 1/128 | C | C  |  |
| 1/129 | C | C  |  13 cent(s) flat |
| 1/130 | C | C  |  25 cent(s) flat |
| 1/131 | C | C  |  38 cent(s) flat |
| 1/132 | Db | C# |  46 cent(s) sharp |
| 1/133 | Db | C# |  33 cent(s) sharp |
| 1/134 | Db | C# |  20 cent(s) sharp |
| 1/135 | Db | C# |  7 cent(s) sharp |
| 1/136 | Db | C# |  4 cent(s) flat |
| 1/137 | Db | C# |  17 cent(s) flat |
| 1/138 | Db | C# |  29 cent(s) flat |
| 1/139 | Db | C# |  40 cent(s) flat |
| 1/140 | D | D  |  44 cent(s) sharp |
| 1/141 | D | D  |  31 cent(s) sharp |
| 1/142 | D | D  |  19 cent(s) sharp |
| 1/143 | D | D  |  7 cent(s) sharp |
| 1/144 | D | D  |  3 cent(s) flat |
| 1/145 | D | D  |  15 cent(s) flat |
| 1/146 | D | D  |  26 cent(s) flat |
| 1/147 | D | D  |  38 cent(s) flat |
| 1/148 | Eb | D# |  47 cent(s) sharp |
| 1/149 | Eb | D# |  36 cent(s) sharp |
| 1/150 | Eb | D# |  24 cent(s) sharp |
| 1/151 | Eb | D# |  13 cent(s) sharp |
| 1/152 | Eb | D# |  2 cent(s) sharp |
| 1/153 | Eb | D# |  8 cent(s) flat |
| 1/154 | Eb | D# |  19 cent(s) flat |
| 1/155 | Eb | D# |  30 cent(s) flat |
| 1/156 | Eb | D# |  40 cent(s) flat |
| 1/157 | E | E  |  45 cent(s) sharp |
| 1/158 | E | E  |  34 cent(s) sharp |
| 1/159 | E | E  |  24 cent(s) sharp |
| 1/160 | E | E  |  13 cent(s) sharp |
| 1/161 | E | E  |  2 cent(s) sharp |
| 1/162 | E | E  |  7 cent(s) flat |
| 1/163 | E | E  |  17 cent(s) flat |
| 1/164 | E | E  |  27 cent(s) flat |
| 1/165 | E | E  |  38 cent(s) flat |
| 1/166 | F | F  |  49 cent(s) sharp |
| 1/167 | F | F  |  38 cent(s) sharp |
| 1/168 | F | F  |  28 cent(s) sharp |
| 1/169 | F | F  |  18 cent(s) sharp |
| 1/170 | F | F  |  8 cent(s) sharp |
| 1/171 | F | F  |  1 cent(s) flat |
| 1/172 | F | F  |  11 cent(s) flat |
| 1/173 | F | F  |  20 cent(s) flat |
| 1/174 | F | F  |  30 cent(s) flat |
| 1/175 | F | F  |  39 cent(s) flat |
| 1/176 | Gb | F# |  47 cent(s) sharp |
| 1/177 | Gb | F# |  38 cent(s) sharp |
| 1/178 | Gb | F# |  28 cent(s) sharp |
| 1/179 | Gb | F# |  18 cent(s) sharp |
| 1/180 | Gb | F# |  9 cent(s) sharp |
| 1/181 | Gb | F# |  0 cent(s) sharp |
| 1/182 | Gb | F# |  9 cent(s) flat |
| 1/183 | Gb | F# |  18 cent(s) flat |
| 1/184 | Gb | F# |  27 cent(s) flat |
| 1/185 | Gb | F# |  36 cent(s) flat |
| 1/186 | Gb | F# |  45 cent(s) flat |
| 1/187 | G | G  |  43 cent(s) sharp |
| 1/188 | G | G  |  33 cent(s) sharp |
| 1/189 | G | G  |  24 cent(s) sharp |
| 1/190 | G | G  |  15 cent(s) sharp |
| 1/191 | G | G  |  6 cent(s) sharp |
| 1/192 | G | G  |  1 cent(s) flat |
| 1/193 | G | G  |  10 cent(s) flat |
| 1/194 | G | G  |  19 cent(s) flat |
| 1/195 | G | G  |  27 cent(s) flat |
| 1/196 | G | G  |  36 cent(s) flat |
| 1/197 | G | G  |  44 cent(s) flat |
| 1/198 | Ab | G# |  44 cent(s) sharp |
| 1/199 | Ab | G# |  35 cent(s) sharp |
| 1/200 | Ab | G# |  26 cent(s) sharp |
| 1/201 | Ab | G# |  18 cent(s) sharp |
| 1/202 | Ab | G# |  9 cent(s) sharp |
| 1/203 | Ab | G# |  1 cent(s) sharp |
| 1/204 | Ab | G# |  6 cent(s) flat |
| 1/205 | Ab | G# |  14 cent(s) flat |
| 1/206 | Ab | G# |  22 cent(s) flat |
| 1/207 | Ab | G# |  30 cent(s) flat |
| 1/208 | Ab | G# |  38 cent(s) flat |
| 1/209 | Ab | G# |  46 cent(s) flat |
| 1/210 | A | A |  42 cent(s) sharp |
| 1/211 | A | A |  34 cent(s) sharp |
| 1/212 | A | A |  25 cent(s) sharp |
| 1/213 | A | A |  17 cent(s) sharp |
| 1/214 | A | A |  9 cent(s) sharp |
| 1/215 | A | A |  2 cent(s) sharp |
| 1/216 | A | A |  5 cent(s) flat |
| 1/217 | A | A |  13 cent(s) flat |
| 1/218 | A | A |  21 cent(s) flat |
| 1/219 | A | A |  28 cent(s) flat |
| 1/220 | A | A |  36 cent(s) flat |
| 1/221 | A | A |  43 cent(s) flat |
| 1/222 | Bb | A# |  45 cent(s) sharp |
| 1/223 | Bb | A# |  38 cent(s) sharp |
| 1/224 | Bb | A# |  30 cent(s) sharp |
| 1/225 | Bb | A# |  22 cent(s) sharp |
| 1/226 | Bb | A# |  15 cent(s) sharp |
| 1/227 | Bb | A# |  7 cent(s) sharp |
| 1/228 | Bb | A# |  0 cent(s) sharp |
| 1/229 | Bb | A# |  6 cent(s) flat |
| 1/230 | Bb | A# |  14 cent(s) flat |
| 1/231 | Bb | A# |  21 cent(s) flat |
| 1/232 | Bb | A# |  28 cent(s) flat |
| 1/233 | Bb | A# |  35 cent(s) flat |
| 1/234 | Bb | A# |  42 cent(s) flat |
| 1/235 | B | B  |  47 cent(s) sharp |
| 1/236 | B | B  |  40 cent(s) sharp |
| 1/237 | B | B  |  32 cent(s) sharp |
| 1/238 | B | B  |  25 cent(s) sharp |
| 1/239 | B | B  |  18 cent(s) sharp |
| 1/240 | B | B  |  11 cent(s) sharp |
| 1/241 | B | B  |  4 cent(s) sharp |
| 1/242 | B | B  |  2 cent(s) flat |
| 1/243 | B | B  |  9 cent(s) flat |
| 1/244 | B | B  |  16 cent(s) flat |
| 1/245 | B | B  |  23 cent(s) flat |
| 1/246 | B | B  |  29 cent(s) flat |
| 1/247 | B | B  |  36 cent(s) flat |
| 1/248 | B | B  |  43 cent(s) flat |
| 1/249 | C | C  |  47 cent(s) sharp |
| 1/250 | C | C  |  40 cent(s) sharp |
| 1/251 | C | C  |  33 cent(s) sharp |
| 1/252 | C | C  |  26 cent(s) sharp |
| 1/253 | C | C  |  19 cent(s) sharp |
| 1/254 | C | C  |  13 cent(s) sharp |
| 1/255 | C | C  |  6 cent(s) sharp |
| 1/256 | C | C  |  |

The program below generates the above table.

```basic
PRINT

LET offset = 2

OPEN "C.txt" FOR OUTPUT AS #1

FOR h = 1 TO 256

  ' ** quadratic actual
    LET qa = 1 / h

  ' ** linear actual
    LET la = LOG(qa) / LOG(1 / 2)

  ' ** nearest
   
    LET lh = 0 - (1 / 12)
    DO
      LET lh = lh + (1 / 12)
      LET qh = (1 / 2) ^ lh
    LOOP UNTIL qh <= qa

    LET c$ = "cent(s) sharp"

    IF (qh - ((1 / 2) ^ (lh - (1 / 12)))) / 2 > qh - qa THEN
      LET lh = lh - (1 / 12)
      LET qh = (1 / 2) ^ lh
      LET c$ = "cent(s) flat"
    END IF

    LET cents = INT(ABS(10000 * (qh - qa) / (qh - ((1 / 2) ^ (lh - (1 / 12)))))) / 100
    IF cents = 0 THEN
      LET c$ = ""
      LET b$ = ""
    ELSE
      LET b$ = STR$(INT(cents)) + " "
    END IF
   
    SELECT CASE (((lh * 12) + offset) MOD 12)
      CASE 0
        LET a$ = "Bb" + CHR$(9) + "A#"
      CASE 1
        LET a$ = "B" + CHR$(9) + "B "
      CASE 2
        LET a$ = "C" + CHR$(9) + "C "
      CASE 3
        LET a$ = "Db" + CHR$(9) + "C#"
      CASE 4
        LET a$ = "D" + CHR$(9) + "D "
      CASE 5
        LET a$ = "Eb" + CHR$(9) + "D#"
      CASE 6
        LET a$ = "E" + CHR$(9) + "E "
      CASE 7
        LET a$ = "F" + CHR$(9) + "F "
      CASE 8
        LET a$ = "Gb" + CHR$(9) + "F#"
      CASE 9
        LET a$ = "G" + CHR$(9) + "G "
      CASE 10
        LET a$ = "Ab" + CHR$(9) + "G#"
      CASE 11
        LET a$ = "A" + CHR$(9) + "A"
    END SELECT

    PRINT #1, "1/" + MID$(STR$(h), 2) + CHR$(9) + a$ + CHR$(9) + b$ + c$

NEXT

CLOSE
```

