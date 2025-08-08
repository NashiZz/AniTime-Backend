import axios from "axios";
import { db } from "@/lib/firebaseAdmin";

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAllAnime() {
  let page = 1;
  let allData = [];
  let hasNextPage = true;

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

  while (hasNextPage) {
    try {
      const response = await axios.post("https://graphql.anilist.co", {
        query,
        variables: { page, perPage: 50 },
      });

      const data = response.data.data.Page;
      allData = [...allData, ...data.media];
      hasNextPage = data.pageInfo.hasNextPage;
      page++;

      // หน่วงเวลา 1.5 วินาที ลดโอกาส rate limit
      await delay(1500);
    } catch (error) {
      if (error.response?.status === 429) {
        // ถ้าโดน rate limit ให้หน่วง 5 วินาที
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
    const allAnime = await fetchAllAnime();

    await db.collection("allanime").doc("data").set({
      list: allAnime,
      updatedAt: new Date(),
    });

    return new Response(
      JSON.stringify({
        message: "All anime data updated successfully",
        total: allAnime.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error updating all anime data:", error);
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
