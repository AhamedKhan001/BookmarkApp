"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. Fetch bookmarks for the current user
  const fetchBookmarks = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/"); // Redirect to login if not authenticated
      return;
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (!error) {
      setBookmarks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBookmarks();

    // 2. REAL-TIME SUBSCRIPTION (Requirement #4)
    // This listens for any changes to the 'bookmarks' table in the database
    const channel = supabase
      .channel('realtime-bookmarks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookmarks' },
        () => {
          fetchBookmarks(); // Auto-refresh the list when data changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Add Bookmark logic
  const addBookmark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return alert("Please fill in both fields");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("bookmarks").insert({
      title,
      url,
      user_id: user.id, // Ensures privacy (Requirement #3)
    });

    if (error) {
      alert(error.message);
    } else {
      setTitle("");
      setUrl("");
    }
  };

  // 4. Delete Bookmark logic
  const deleteBookmark = async (id: number) => {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", id);
    
    if (error) alert(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-blue-600">Smart Bookmarks</h1>
        <button 
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-red-500 transition"
        >
          Logout
        </button>
      </nav>

      <div className="max-w-2xl mx-auto py-10 px-4">
        {/* Input Form */}
        <form onSubmit={addBookmark} className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Save a new link</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Bookmark Title (e.g. GitHub)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
            >
              Add Bookmark
            </button>
          </div>
        </form>

        {/* Bookmark List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-700">Your Private List</h2>
          {bookmarks.length === 0 ? (
            <p className="text-gray-500 italic">No bookmarks found. Add your first one above!</p>
          ) : (
            bookmarks.map((b) => (
              <div
                key={b.id}
                className="flex justify-between items-center bg-white p-5 rounded-lg border border-gray-200 hover:shadow-md transition"
              >
                <div className="overflow-hidden">
                  <p className="font-bold text-gray-900 truncate">{b.title}</p>
                  <a 
                    href={b.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-blue-500 hover:underline truncate block"
                  >
                    {b.url}
                  </a>
                </div>
                <button
                  onClick={() => deleteBookmark(b.id)}
                  className="ml-4 bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-md transition"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}