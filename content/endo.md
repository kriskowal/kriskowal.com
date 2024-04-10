---
title: Endo
layout: layouts/post.njk
tags:
- posts
- home
date: 2024-02-23
---

My work at Agoric is the care and feeding of a project called
[Endo](https://github.com/endojs/endo) that provides solutions for some
[important problems with JavaScript and the open web](/giants/).
With Endo, some of our objectives are to:

* restore agency to users,
* encourage fearless coöperation among users and services,
* enable applications to defend their own integrity, in their interaction with
  other parties and even their own dependencies,
* encourage programs to exploit more parallelsim both locally and remotely,
* provide options for the transmission and storage of web applications between
  users and services.

Users currently lack agency because of free-standing complex between web
browsers, search engines, web services, and advertisers.
The crux is the connection between a web page and a web server, a connection we
must break.
To break that connection, we need a new model for distributing web applications
and enabling a user to manage the authority they may pass down to a web
application.
In doing so, we also make web applications easier to archive and ensure they
can thrive after their authors stop paying their hosting bills.

Users and services coöperate to the degree that they are safe.

* The bar for browsing the web is lower than the bar for
* installing a browser extension which is lower than the bar for
* installing an application from a credible app store which is lower than the
  bar for
* downloading an executable from a web page and running it on the same computer
  where you manage your passwords and finances which, for the love of all that
  is holy, is roughly the same as
* `npm install` or the blightëd
* `curl https://example.com/install.sh | sh`

We seek a yet lower bar.
To make a user safer while running an application they need:

* a platform that fully confines the application, not even giving it a
  connection to its author’s server,
* a transparent vessel for storing and transporting the application, so its
  contents, behavior, and provenance can be made obvious to a user or any
  credible auditor.

To make the user safe and _increase_ the degree of coöperation the platform
enables, we also need to give the application the ability to converse with the
user in order to obtain additional capabilities.
Then, we need to be able to restore those capabilities each time the
application starts without harrassing the user.

At time of writing, Endo is a bag of tools that can be assembled in various
ways to achieve each of these goals.
The most advanced assemblage is the Agoric blockchain that enables
unprecedented coöperation between smart contracts and orchestration of
contracts that span multiple chains.
The same technologies could be combined for a workflow engine with
mere Byzantine Fault Tolerance, when Sybil Attack Resistance is unnecessary.

Agoric and MetaMask are also building a user agent, tentatively called a
Pet&nbsp;Dæmon. The Pet&nbsp;Dæmon and [Spritely’s
Goblins](https://spritely.institute/goblins/) both draw from the designs of
earlier Power Boxes like the [DARPA
Browser](http://www.combex.com/tech/darpaBrowser.html).
This is a single node operating on behalf of a single user, that can connect to
the dæmons of other users and services.
With the dæmon, a user can make, store, transmit, open, and manage the
authorities that they grant their “weblets”.

A weblet is a web page in a box.
The box is a zip file.
The daemon can confine a web application, spinning up an independent, local web
server for each application, and give that application a connection to the
dæmon so that, if it asks nicely and doesn’t look suspicious, it can reach
objects owned by users or servers anywhere in the internet-connected universe.

This is all possible because of key technologies.

* Hardened JavaScript
* Capability transfer protocols
* Pet name systems

Hardened JavaScript gives a program (either a host, guest, or any of their
dependencies) the ground they need to stand on to defend their own integrity.
That means they can share objects with each other in the same shared memory
and ensure that no other program can tamper with their API.
Not all JavaScript is automatically safe.
Some care is necessary toward mounting a defense, but a defense is _actually
possible_.

Capability transfer protocols allow a program to present an object to
another program over a multiplexed connection.
Holding a reference to a remote object represents a capability to invoke
that objects messages and receive either data or references to other objects.
Unlike ordinary RPC, capability transfer protocols can _pipeline_ method
invocation onto the expected response from a prior request because the
sender selects an identifier for each request it sends.
This makes these protocols cheaply extensible with ordinary object-oriented
protocol design without incurring the cost of a round-trip for serial
invocation.

In this model, objects are equivalent to capabilities and authority.
Having a reference to an object represents the right to use it.

This fine-grained object-oriented protocol design also trivializes coöperation
between multiple threads or processes locally.
Ad hoc message protocols and multiplexers are no longer necessary to coördinate
jobs across worker boundaries, and the same protocols can stretch across hosts,
and between strangers on the internet.

Pet name systems allow a user to credibly and privately refer to remote objects
with their own names.
They stand on the ege of “human-meaningful” and “secure” on [Zooko’s Triangle
(Wikipedia)](https://en.wikipedia.org/wiki/Zooko's_triangle), meaning they are
personal and familiar and achieve security by referring to large, unguessable
numbers that can be shared in confidence between strangers without betraying
either party’s sentiments toward the referent.

The Pet Dæmon’s idiom is chat.
When one user sends a message to another,
they refer to authorities with their own names.
They can also suggest a name for the receiver.
On the wire, the message includes the suggestion and the large, unguessable number
that conveys the actual authority.
The receiver may adopt the name or choose one of their own.

When a confined application or weblet asks for a capability,
this appears to the user as a similar message and they and reject the request
or grant access to a capability by name.

On this basis, users and services can exchange both applications and protocols
with unprecedented control, safety, and expressivity.
We break the link between web pages and web servers and restore agency to the
user, who can then manage whether and which applications should be able to
communicate.
We create _opportunity_ for more kinds of interaction and relax our dependence
on giants.

