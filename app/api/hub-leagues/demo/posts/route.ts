import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    posts: [
      {
        id: "demo-post-1",
        tag: "Power Rankings",
        weekLabel: "Week 14",
        title: "The Machine is not stopping — Week 14 Rankings",
        excerpt: "Marcus continues to dominate with 10 wins but we're right behind him. The playoff picture is clear: top 4 advance and it's going to be a bloodbath.",
        readTime: "2 min read",
        publishedAt: "2025-11-25T12:00:00.000Z",
        author: { id: 2, firstName: "Marcus", lastName: "W.", username: "marcusw", profileImage: "" },
        _count: { likes: 9, dislikes: 1, comments: 4 },
      },
      {
        id: "demo-post-2",
        tag: "Trade",
        weekLabel: "Week 13",
        title: "I didn't lose that CeeDee trade and I will die on this hill",
        excerpt: "Everyone's chirping but Jefferson is going to go absolutely crazy in the playoffs. Marcus got swindled and he just doesn't know it yet.",
        readTime: "1 min read",
        publishedAt: "2025-11-18T09:30:00.000Z",
        author: { id: 3, firstName: "Tyler", lastName: "R.", username: "tylerrr", profileImage: "" },
        _count: { likes: 3, dislikes: 7, comments: 11 },
      },
      {
        id: "demo-post-3",
        tag: "Recap",
        weekLabel: "Week 12",
        title: "Week 12 Recap: Chaos across the board",
        excerpt: "Three projected winners lost. Two guys started their bye week players. It's that time of year. Playoff seeding is basically a coin flip at this point.",
        readTime: "3 min read",
        publishedAt: "2025-11-11T18:00:00.000Z",
        author: { id: 1, firstName: "Commissioner", lastName: "", username: "commish", profileImage: "" },
        _count: { likes: 14, dislikes: 0, comments: 6 },
      },
    ],
  });
}
