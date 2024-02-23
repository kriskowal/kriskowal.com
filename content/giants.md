---
title: A Choice of Giants
layout: layouts/post.njk
tags:
- posts
date: 2024-02-22
---

The web has made incredible strides since the day I wrote my first `<FONT>` tag.
In the intervening years, the platform has risen to make everything worth doing
relatively easy.

* Putting a card in the middle of a web page is now trivial.
* Event handling is uniform across all browsers.
* No one worries about cyclic references between the DOM and JavaScript closures.
* The platform has absorbed jQuery.
* Tables are still weird but we have come to love them.
  We abused them for layout, then we maligned them for being abused.
  Now they are free.
* With one weird trick, browsers can be made to agree whether borders are
  inside or outside a bounding box.
* Font tags have gone the way of the marquee tags.
* Quirks Mode is a historical footnote.

We can go home now.

However, our solutions have bred new problems, and I’m not talking about React.
Not here.
Not today.

It has never been easier to make and share a 90s era home page.
But, we don’t make 90s era web pages anymore.
The social media giants have herded us into their pens and we rarely contribute
to the vast wilderness of free information.
So, the web search giants are starving, unable to infer relevance from links,
forced to show nothing but advertisements above the fold.
The rising giants of artificial intelligence must make do with everything that
has ever been said in public and everything that was given freely to other
giants in private.
Going forward, any intellectual property worth keeping will be worth keeping
secret.

We have a surplus of giants all in need of feeding.
And so we feed them for lack of better options.

---

Thus begins the era of better options.
Some of them are already here.
Some of them were always here.

For example, we have Signal which gives us rooms where we can have private,
earnest, intimate conversations: rooms where we can safely make social
mistakes; rooms where we can grow and be forgiven.
We no longer have to feed a social media giant if we want to chitchat, all for
the low-low price of enabling other jerks to chitchat too.
We need only trust the developers of the chat app and our app store giants to
remain benevolent.

We also have Mastodon and ActivityPub.
Just like the first time a Boomer photocopied a page of jokes and a vaguely
menacing threat and forwarded it to a dozen friends and family, we can once
again experience the thrill of whispering in a crowded room where every living
being can hear.
We can wait to see if anyone heard us, liked us, loved us, shared us.
Though we no longer need to feed a social media giant, we do still have to
worry about what happens to us when the wrong people hear.

We can still make 90s era web pages.
They feed the search giants, but sometimes we want to be found or influence
what else can be found.
If they abuse our attention with enough advertisements, we can feed a different
search engine.
Not all of them are giants.
Some of them let you pay them so they can stay in business without betraying
your trust.

We can still send email and you can choose whether you need to feed a giant to
do that.
Mailing lists still work.

We need a better dream.
I’ve got one and it can be yours for free[†](#free).

<a name="free">† Free as in Arrakis, home to the most valuable resource in the
universe and the perpetual struggle to defend it[‡](#giants).</a>

<a name="giants"><small>‡ There might (still) be giants.
The giants might be worms.</small></a>

---

There is a rapidly deteriorating fiction that a web browser represents the
interests of the user.

The first moves were chosen wisely.
Over a backdrop of people emailing each other `virus.exe` and booting their
computers off CDs they found in parking lots, the web was born into a
memory safe language with an event loop.
A web page couldn’t read your passwords, delete your recipes, or draw a button
outside of its frame.
We called that frame the “chrome”.
Now it’s spelled “Chrome” and because we can’t contemplate alternatives, we
feed the giant.
But, I digress.

It took some time for the cracks to show.
Web pages have an umbilical cord to the server that hosted them.
Web servers can talk to each other and web pages can talk to other web servers.
In defense of their own reputation,
a web server can _choose_ to limit their web page’s ability to run strange
programs, but _you_ can’t choose to prevent a web page from talking
to its web server.
So, a vast network of pervasive surveilance is born.

As this system grew, the paltry defense of your passwords and recipes became
irrelevant.
The important passwords and recipes are no longer on your computer.
They are on other web servers.

Then, every browser became dependent on the money that flows from search.
Making a browser that breaks the connection between a web page and a web server
is not contemplatable.

We call web browsers “user agents” even though you, a user, no longer have
agency.

---

Meanwhile, there is also a rapidly deteriorating fiction that a web application
represents the interests of any single author.

The vast majority of software bundled into a web application is _dependencies_.
Where `virus.exe` ran away with all the authority of the user,
a web page’s dependencies run away with all the authority of the web page.

While we contemplate agency in the next generation of the web, we must
also contemplate the agency of the author of an application.
If we can credibly confine a web application, can the application also credibly
confine its dependencies?

---

I don’t know whether there was ever a credible fiction that app stores
represented the interests of users _or_ services.
They offer to defend the interests of users by guarding their own gates, but
they also use those gates and their own promotional mechanisms to ensure that
they collect the lion’s share and suffer no competition.

They provide no credible isolation at runtime, so one does not simply publish
an app.
One must constantly run the treadmill of recompiling with the latest patch
releases of all the underlying frameworks in the hope of staying one step ahead
of a zero-day exploit that would not have been possible in the security
model of a web page.

One does not archive an app.
One does not keep an app.
One does not send an app to a friend.
One does not pass an app on to their children.

---

We need a better dream.

I dream that the next frontier of the web is chat, where all social problems
and solutions begin and end.
The web needs some of that.

Chat is a medium of distribution.
We already use chat to distribute links and embed media.
Currently, those links exit to web pages or apps.
We can trust neither.
We need chat to become a medium for delivering web pages and web apps.
Let’s call these “weblets”.

* Weblets are confined.
  They have no implicit ties or dependence to an original host.
  To connect to a host, they must obtain it with the grace of the user.
  They must chat.
  So, chat becomes also a medium for obtaining permission.

* Weblets can be saved.
  A weblet is self-confined.
  They can be archived.
  They can be sent to a friend.
  They do not break with age.

We (old people) remember when Microsoft undermined desktop publishing and
spreadsheets just by making it possible to link and embed objects across those
hitherto isolated realms.

We should do that.
We should do that in the open.
We should do that with federation.
We should do that on a grander scale than has ever been seen before.

Now we can talk about [Endo](/endo/).
