import axios from "axios";
import { db } from "@/lib/firebaseAdmin";

async function fetchAllAnime() {
  let page = 1;
  let allData = [];
  let hasNextPage = true;

  while (hasNextPage) {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            currentPage
            hasNextPage
          }
          media(type: ANIME) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
            }
            episodes
            status
            startDate {
              year
              month
              day
            }
            endDate {
              year
              month
              day
            }
            format
            season
            seasonYear
            genres
            averageScore
          }
        }
      }
    `;

    const response = await axios.post("https://graphql.anilist.co", {
      query,
      variables: { page, perPage: 50 },
    });

    const data = response.data.data.Page;
    allData = [...allData, ...data.media];
    hasNextPage = data.pageInfo.hasNextPage;
    page++;
  }

  return allData;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const allAnime = await fetchAllAnime();

    // เก็บข้อมูลลง Firestore
    await db.collection("allanime").doc("data").set({
      list: allAnime,
      updatedAt: new Date(),
    });

    return res.status(200).json({
      message: "All anime data updated successfully",
      total: allAnime.length,
    });
  } catch (error) {
    console.error("Error updating all anime data:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
