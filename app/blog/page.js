'use client';

import { personalData } from "@/utils/data/personal-data";
import BlogCard from "../components/homepage/blog/blog-card";
import { useEffect, useState } from "react";

export default function Page() {
  const [blogs, setBlogs] = useState([]);
  const [displayCount, setDisplayCount] = useState(6);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getBlogs = async () => {
      try {
        const res = await fetch(`https://dev.to/api/articles?username=${personalData.devUsername}`);
        
        if (!res.ok) {
          throw new Error('Failed to fetch data');
        }

        const data = await res.json();
        const normalized = data.map((blog) => ({
          ...blog,
          cover_image: blog.cover_image || '/image/screen.png',
        }));

        setBlogs(normalized);
      } catch (error) {
        console.error('Error fetching blogs:', error);
      } finally {
        setLoading(false);
      }
    };

    getBlogs();
  }, []);

  const visibleBlogs = blogs.slice(0, displayCount);
  const hasMore = displayCount < blogs.length;

  return (
    <div className="py-8">
      <div className="flex justify-center my-5 lg:py-8">
        <div className="flex  items-center">
          <span className="w-24 h-[2px] bg-[#1a1443]"></span>
          <span className="bg-[#1a1443] w-fit text-white p-2 px-5 text-2xl rounded-md">
            All Blog
          </span>
          <span className="w-24 h-[2px] bg-[#1a1443]"></span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <p className="text-white">Loading blogs...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 lg:gap-8 xl:gap-10">
            {
              visibleBlogs.map((blog, i) => (
                <BlogCard blog={blog} key={i} />
              ))
            }
          </div>

          {hasMore && (
            <div className="flex justify-center mt-8 lg:mt-12">
              <button
                onClick={() => setDisplayCount(blogs.length)}
                className="px-6 py-2 lg:px-8 lg:py-3 text-white bg-gradient-to-r from-[#16f2b3] to-[#16f2b3] hover:opacity-80 transition-all duration-300 rounded-lg font-medium"
              >
                View More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}