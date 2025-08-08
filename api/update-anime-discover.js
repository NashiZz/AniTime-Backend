import axios from "axios";
import { db } from "@/lib/firebaseAdmin";

async function fetchAllPages(sort, type = "ANIME", statusFilter = null) {
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
          media(sort: ${sort}, type: ${type} ${statusFilter ? `, status: ${statusFilter}` : ""}) {
            id
            title { romaji english native }
            coverImage { large }
            episodes
            status
          }
        }
      }
    `;

    const response = await axios.post("https://graphql.anilist.co", {
      query,
      variables: { page, perPage: 50 }
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
    const trending = await fetchAllPages("TRENDING_DESC");
    const popular = await fetchAllPages("POPULARITY_DESC");
    const upcoming = await fetchAllPages("START_DATE", "ANIME", "NOT_YET_RELEASED");
    const latest = await fetchAllPages("START_DATE_DESC");

    await db.collection("anime_discover").doc("data").set({
      trending,
      popular,
      upcoming,
      latest,
      updatedAt: new Date(),
    });

    return res.status(200).json({ message: "All anime data updated successfully" });
  } catch (error) {
    console.error("Error updating anime data:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}