---
title: Uber to Agoric
layout: layouts/post.njk
tags:
- home
date: 2020-04-08
---

I have a bit of good news and bad news. Friday, April 3, was my last day at Uber. Monday, April 6, was my first day at Agoric.

I started at Uber 5½ years ago, on the dispatch system. I joined Tom Croucher’s team, which focused on common frameworks for marketplace systems, with Jake Verbaten, Russ Frank, and spiritually Matthew Esch. When I arrived, the scaffolding and frameworks were in place. I wrote a tool for verifying that JSON schema evolution remained backward-compatible, did some weird stuff to automatically mix the middleware stack, and wrote a thing to balance load across Node.js processes more fairly than the Linux kernel. I don’t believe any of that work made it to production, really, but for those six months, I learned how to operate global dispatch while I was on-call for 24 hours once a month and developed a bald spot.

I then got on board a new Distributed Systems Group under Matt Ranney’s guidance and many of the folks I’ve been working with to this day. Matt had designed a DHT based on the SWIM gossip protocol called Ringpop. My group built on that by writing TChannel, a TCP multiplexer designed specifically for the DHT, and then Hyperbahn, a service mesh based on both. I wrote the circuit breaker for Hyperbahn and helped build and then rewrote an implementation of Apache Thrift for Node.js, which is my most pervasive and lasting contribution to Uber.

Then we got a new crop of directors and a new team was spawned off ours to replace Hyperbahn with an implementation in Go that had separate control and data planes, and ran a dedicated forwarding process on every host. I then joined the subgroup focusing on RPC client libraries. We built YARPC. At first we were writing YARPC in Node.js, Python, Go, and Java. It was an abstraction layer that separated the encoding and transport layers in a way you could switch the transport (TChannel to HTTP for example) with configuration changes and no code changes. About six months in, we cut Java, then Node.js, then Python (because the scope was too high and the pace too slow), and I’ve been writing Go ever since. I believe three quarters of Uber services written in Go (a substantial portion of all services) use YARPC.

YARPC became important for the gRPC migration because 1. the Go library for gRPC is not particularly ready to commit to an API forever 2. YARPC can trivially support both Protobuf and Protobuf-flavored-JSON in process. The alternative is to use a REST bridge as a separate service.

At Agoric, I’ll be returning to an old JavaScript mission.

For those just tuning in, I’ve been working on a computer game side project since I was eleven years old. One of the many wandering paths of that endeavor led me to learn JavaScript and around 2006, to get ornery because you couldn’t just find and use libraries off the internet like you could in Python or Perl.

I spent a couple years studying and writing JavaScript module systems, then trying to convince people that they should all use one module system so we could share code between frameworks. This was something of an uphill battle.

In late 2007, I was about to relocate from Cupertino to Pasadena and I’d read about Google Caja, which was a project to create a JavaScript security model that allowed “mutually suspicious” programs to interact with each other in the same process. Things like ads, games, and login widgets on the same page. Mashups were a pretty big deal at the time, but the security models were not particularly rigorous yet and none of them afforded the flexibility of the object capability model.

I figured that Caja would be the kind of project that would be a potential beach head for a module system so I sent the developers a cold email pitching the idea and this is how I met Mark S. Miller.

Caja wasn’t in a position to immediately benefit from my module system idea, but Mark, it turns out, knew Doug Crockford and through that relationship they both were sitting on TC39, the committee that coordinates the evolution of JS. Mark put me and Ihab Awad on the agenda in late 2008 to give a proposal for modules. So, when Kevin Dangoor started a group called ServerJS a few weeks later, we had a proposal ready. This is where CommonJS modules came from. In late 2009, this is the system Node.js and then NPM adopted. Working on CommonJS is how I met Tom Robinson, who brought me on board the Montage project at Motorola in 2011. Presenting CommonJS in Berlin in late 2010 is how I met Tom Croucher, who would later hire me at Uber in 2015.

Mark and Ihab had all the while been whispering “you should look into promises” into my ear. Mark was working on an early draft proposal for promises for TC39 and his colleague Tyler Close had written a JS library called Q for a project called Waterken, that was like Caja but with a Java backend. I spent the next four years putting together the Q package in NPM. Domenic Denicola joined me on the project a year or two in and aggressively promoted it at all the JS conferences and eventually led the effort to carry its design back to TC39 and a subset of the Q promise has since become a standard implemented by all the engines.

But promises, particularly Q promises, have an unfinished mission. They are just part of a complete distributed object capability system. Promises can be asynchronous proxies. Since all interactions with a promise are asynchronous, the business end works the same way regardless of whether the working end is in the same process or or somewhere else entirely. I implemented this with Q and Q Connection, but to be practical, we needed a JavaScript WeakRef and WeakMap. We needed Proxy to establish a foundation for the design. This is where I left off many years ago. And all of these things are real now.

This is just a slice of a much longer arc with a much larger cast that may have begun, depending on when you start counting, in the 1970’s. The cast includes Mark Miller, Dean Tribble, Chip Morningstar, Chris Hibbert, and others along the way. They have worked together at many companies over the years on fragments of the same idea. Parts of the story were made on Project Xanadu. Other parts, at Xerox PARC. Many of them worked at Electronic Communities. There was a company called Agorics in the 90’s. Chip and Doug made JSON together in the aughts. And for this scene, many of them have gotten the band back together and started a company called Agoric.

Dean and Mark coïnvented promise pipelining. Dean was also an architect of the Midori OS at Microsoft. This had some relationship with an actor model system called Orleans and one of the muses for Ringpop. Dean has been championing WeakRef at TC39. He’s the Agoric CEO.

Agoric is building a system for distributed smart contracts on block chains. They are building open source components. Contracts on the chain will be JS programs that run deterministically and communicate through promise message passing on the chain. The chain decides the order of message arrival every commit interval.

One of those components is SES (Secure ECMAScript), the modern successor to Caja. They are pushing for JS standards for Realms and Compartments. These touch both the object security model and also the module system. They are also working on a proposal for HandledPromise (the primitive needed to pipe promise messages between processes).

There’s a great deal more going on at Agoric to realize a 30 year dream of a vibrant cryptographic electronic economy. My involvement starts with advancing SES, both the shim Agoric maintains and eventually the standards behind it. I’m likely to be involved in the remote promise work.

Agoric also uses a tool called SwingSet as a kernel for this architecture. It is based on the same ideas as Q Connection but goes on to shorten message routes when promises are passed between processes. SwingSet was prototyped in Rust and implemented atop SES. Brian Warner is the lead engineer. You may remember Brian through his work on Mozilla Jetpack (one of the first CommonJS implementations, for browser plugins) and Twisted Python (the predecessor of Tornado and Python’s now built-in async io module).

I’ve never grown as quickly as an engineer as I have because of the demands and inspiring colleagues I’ve had at Uber. I’ve always wondered what hyper-growth looked like on the inside and I will never have to wonder again (it is very much like the big bang: it’s brief, exhilarating, and leaves a mess). I’d also never gotten to operate a production backend system at scale. I’ve learned a great deal about sharding, load balancing, and fault tolerance. Enough to teach a college course.

And I’m excited to be returning to my old ambitions with a team of industry veterans. We are going to change the world and it will be open source and standards-tracked. I’ll be going from one of the more senior engineers at a large company to one of the most junior engineers at a small company. I could not be more eager.

You will hear a great deal more from me in the years to come.

Kris Kowal
