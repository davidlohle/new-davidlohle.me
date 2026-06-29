---
title: "On Platforms as a <em>Product</em>"
crumb: "Platforms as products"
date: 2026-05-20
summary: "Nearly a decade on, treating your platform as a product is more important than ever."
description: "Why internal platform teams should run their platform like a product—brand, roadmap, user feedback, and the sense of ownership that turns a runtime into something people choose."
---

The first internal platform I ever loved had a logo. Someone on the team had drawn it in Sketch over a long weekend—a little mascot with a name, and printed stickers you could put on your laptop. There was a Slack channel where the team triaged feature requests like a customer support queue. There was a roadmap. There were weekly reviews with users.

Technically, nothing about it was remarkable. But every product engineer in the building knew its name, knew who built it, and *spoke about it as if it were a thing*. They didn't know, nor care, that it was a Concourse pipeline that pushes .jars to VMs. The technical details didn't matter: it was a *thing*, with a personality, a team behind it, and a Slack channel where you could ask questions or submit feedback and someone would actually answer.

In short, this team did what we always do and built an abstraction layer. But, rather than it being a technical one, it was more of a human one: a brand. This was, and is, the whole trick.

## A business within a business

The pitch for treating your internal platform like a product is not complicated. You have engineers who write applications, and you have engineers who provide the runtime those applications execute on. The runtime team's customers are the application team. Their job is to make those customers' lives easy enough that they'd choose your platform if it were one of three options on a procurement spreadsheet—usually against some GCP or AWS solutions. They'd want your platform, because word-of-mouth has told them how easy ACME Roadrunner (dumb example, sorry) is to use, or how cost-effective it is. Running it as a product increases user satifaction, and giving it a brand gives users something to tie that satisfaction to.

So: run it like a product. Give the team a name. Let them brand it. Let them solicit feedback. Let them say no to feature requests that don't fit (who wants an omelette at a steakhouse?). Let them measure things—adoption, time-to-first-deploy, p99 of the time it takes to get a change into production, and report those numbers up the chain the way a product team would report DAU. Let SRE handle reliability the way a product team handles uptime. Let the platform team be *proud* of the thing they've made.

The symbiotic relationship is the point. Product engineers get to stop thinking about the runtime, which frees them to do the work they were hired for. Platform engineers get a sense of ownership—*this is mine, I made this, my name is on it*—which is the single most reliable motivator I've ever seen in a software team. Everybody gets to be good at their job because everybody gets to do their job.

## The Pivot

I spent my formative years at Pivotal, a deeply XP shop: pair programming all day, TDD, pizza-box-size teams, and user-centered design applied to *literally everything*, including the internal tooling. The thing that impacted me the most is that "user-centered design" doesn't stop at the external boundary of your product. Your colleagues are users. Your platform team's users are the application engineers two desks over. The same discipline applies: talk to them, watch them work, find out where the friction is, and ship something that removes it.

The other thing Pivotal taught me—and I am still trying to articulate this properly a decade later—is that *engagement matters*. Engineers are creatives that want to build. The ones who feel like their work has a name, an audience, and a reputation are engaged and outperform the engineers who feel like they are filling in a Jira board, every single time. The internal platform team that has a logo and a roadmap and a Slack channel full of opinionated users is the one that ships. The team that is the "infrastructure org, second floor" is the one that's constantly underwater.

You hired great engineers. The bet has already been placed. The only remaining question is whether the structure around them lets them do great work, or whether it grinds them down into ticket-closers.

## The alternative is crashing out

The opposite of "platform as product" is "platform as cost center." A cost center has no users. It has *tickets*: soulless, agency-robbing, eyes-glazed-over *tickets*.

I've spent so much time with under-resourced and under-empowered platform teams. They have all the responsibilities of running production but none of the agency to fix the things they know are broken. They cannot say no to feature requests. They cannot prioritize. They are measured on uptime but not on the experience of the people they serve. They are, in effect, an internal vendor whose customers can't fire them. And in turn, they've become deeply cynical, disengaged, and burned out.

This is a particular kind of misery, but it's solvable. Not by hiring more people, or buying another vendor product; but by giving the team a product to own. By letting them say no. By giving them KPIs that reflect the experience of their users, not the number of tickets in the backlog. By letting them put a logo on a sticker and hand it out at all-hands.

I completely get how silly this sounds. A logo? Stickers? The vibe of a startup-within-a-startup? Yes. All of it. It works. I have watched it work at countless companies now, and the variance in outcomes between "the platform team has a brand" and "the platform team has a Confluence page" is, no exaggeration, the difference between a company that can pivot when the wind changes and one that cannot.

That's the real prize: a company whose platform engineers are proud of what they've built is a company whose application engineers can focus on the application. Which is to say: a company that can move. When the market shifts, when the customers shift, when somebody at the top says "we need to do X by Q3"—the company with the good internal platform can. The company without one is going to spend the first two months of Q3 arguing about whose Kubernetes cluster the new service goes on.

The platform is the substrate of the company's ability to change. Treat it like a product. Give it a name. Let the team be proud.
