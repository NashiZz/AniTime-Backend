import axios from "axios";
import { db } from "@/lib/firebaseAdmin";

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAllPages(sort, type = "ANIME", statusFilter = null) {
  let page = 1;
  let allData = [];
  let hasNextPage = true;

  const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort], $type: MediaType, $status: MediaStatus) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          currentPage
          hasNextPage
        }
        media(sort: $sort, type: $type, status: $status) {
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
        }
      }
    }
  `;

  while (hasNextPage) {
    try {
      const variables = {
        page,
        perPage: 50,
        sort: [sort],
        type,
        status: statusFilter,
      };

      const response = await axios.post("https://graphql.anilist.co", {
        query,
        variables,
      });

      const data = response.data.data.Page;
      allData = [...allData, ...data.media];
      hasNextPage = data.pageInfo.hasNextPage;
      page++;

      // หน่วง 1.5 วินาทีเพื่อลดโอกาสโดน rate limit
      await delay(1500);
    } catch (error) {
      if (error.response?.status === 429) {
        // หน่วง 5 วินาทีถ้าโดน rate limit
        await delay(5000);
      } else {
        throw error;
      }
    }
  }

  return allData;
}

export async function GET(request) {
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

    return new Response(
      JSON.stringify({ message: "All anime data updated successfully" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error updating anime data:", error);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
