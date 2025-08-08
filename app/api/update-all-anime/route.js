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

// Export ฟังก์ชันสำหรับ method GET เท่านั้น
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
