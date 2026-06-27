import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE = "http://localhost:3000";

function App() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const fileInputRef = useRef(null);

  // Authentication State
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(
    localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null
  );
  const [isRegister, setIsRegister] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Preview States
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTextContent, setPreviewTextContent] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Dropdown Menu State
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Load files when token is available or changes
  useEffect(() => {
    if (token) {
      fetchFiles();
    } else {
      setFiles([]);
    }
  }, [token]);

  // Click outside to close dropdown
  useEffect(() => {
    const closeAllDropdowns = () => setActiveDropdown(null);
    window.addEventListener("click", closeAllDropdowns);
    return () => window.removeEventListener("click", closeAllDropdowns);
  }, []);

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/files`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setFiles(response.data);
    } catch (error) {
      console.error("Error fetching files:", error);
      if (error.response?.status === 401) {
        // Token might be expired or invalid
        handleLogout();
        addToast("Session expired. Please log in again.", "error");
      } else {
        addToast("Failed to fetch files from server", "error");
      }
    }
  };

  const getFileType = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    if (["mp3", "wav", "ogg"].includes(ext)) return "audio";
    if (["mp4", "webm"].includes(ext)) return "video";
    if (["txt", "md", "js", "html", "css", "json", "ts", "jsx", "tsx"].includes(ext)) return "text";
    return "unknown";
  };

  const handlePreview = async (file) => {
    const type = getFileType(file.originalName);
    setPreviewFile(file);
    setIsPreviewLoading(true);
    setPreviewUrl("");
    setPreviewTextContent("");
    
    try {
      const response = await axios.get(`${API_BASE}/files/${file.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: type === "text" ? "text" : "blob"
      });

      if (type === "text") {
        setPreviewTextContent(response.data);
      } else {
        const mimeMap = {
          image: "image/*",
          pdf: "application/pdf",
          audio: "audio/*",
          video: "video/*"
        };
        const blobType = response.data.type || mimeMap[type] || "application/octet-stream";
        const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: blobType }));
        setPreviewUrl(blobUrl);
      }
    } catch (error) {
      console.error("Preview error:", error);
      addToast("Failed to fetch file for preview", "error");
      setPreviewFile(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewFile(null);
    setPreviewUrl("");
    setPreviewTextContent("");
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await axios.post(`${API_BASE}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      addToast("File uploaded successfully!");
      setSelectedFile(null);
      setUploadProgress(0);
      setIsUploadModalOpen(false); // Close popup
      fetchFiles();
    } catch (error) {
      console.error("Upload error:", error);
      const errorMsg = error.response?.data?.error || "Failed to upload file";
      addToast(errorMsg, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      addToast(`Downloading ${file.originalName}...`);
      
      // Fetch file as a Blob with authorization header
      const response = await axios.get(`${API_BASE}/files/${file.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: "blob"
      });

      // Create a local blob URL and trigger download link
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", file.originalName);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download error:", error);
      addToast("Failed to download file. You may not have access.", "error");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await axios.delete(`${API_BASE}/files/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      addToast("File deleted successfully!");
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      console.error("Delete error:", error);
      addToast("Failed to delete file", "error");
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      addToast("Please fill in all fields", "error");
      return;
    }
    setAuthLoading(true);
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const response = await axios.post(`${API_BASE}${endpoint}`, {
        email: authEmail,
        password: authPassword
      });
      
      const { token: receivedToken, user: receivedUser } = response.data;
      
      localStorage.setItem("token", receivedToken);
      localStorage.setItem("user", JSON.stringify(receivedUser));
      
      setToken(receivedToken);
      setUser(receivedUser);
      addToast(isRegister ? "Registered and logged in successfully!" : "Logged in successfully!");
      
      setAuthEmail("");
      setAuthPassword("");
    } catch (error) {
      console.error("Auth error:", error);
      const errorMsg = error.response?.data?.error || "Authentication failed";
      addToast(errorMsg, "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
    setFiles([]);
    addToast("Logged out successfully.");
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getFileIcon = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    
    // PDF Icon
    if (ext === "pdf") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
          <path d="M9 15h.01M12 15h.01M15 15h.01M9 18h.01M12 18h.01M15 18h.01"/>
        </svg>
      );
    }
    
    // Image Icon
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      );
    }
    
    // Code/Text Icon
    if (["txt", "md", "js", "html", "css", "json", "ts"].includes(ext)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <line x1="10" y1="9" x2="8" y2="9"/>
        </svg>
      );
    }

    // Default File Icon
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    );
  };

  // If user is not logged in, render authentication page
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center font-sans select-none text-white bg-black p-4 relative overflow-hidden">
        {/* Backdrop Glow Effects */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-zinc-950/60 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent mb-2">
              O3 - Secure Drive
            </h1>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
              {isRegister ? "Create a new account" : "Sign in to access your storage"}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/5 focus:border-indigo-500/40 text-sm outline-none transition-all duration-200"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/5 focus:border-indigo-500/40 text-sm outline-none transition-all duration-200"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-2 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <span>Loading...</span>
              ) : (
                <span>{isRegister ? "Create Account" : "Sign In"}</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-white/5 pt-6">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setAuthEmail("");
                setAuthPassword("");
              }}
              className="text-xs font-semibold text-zinc-400 hover:text-indigo-400 transition-colors duration-200 cursor-pointer bg-transparent border-none"
            >
              {isRegister ? "Already have an account? Sign In" : "Don't have an account? Register"}
            </button>
          </div>
        </div>

        {/* Toast Messages */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
          {toasts.map((toast) => (
            <div className={`flex items-center gap-3 py-3 px-5 rounded-xl text-white text-sm font-semibold shadow-xl ${
              toast.type === "success" 
                ? "bg-gradient-to-r from-emerald-500 to-teal-600" 
                : "bg-gradient-to-r from-rose-500 to-red-600"
            }`} key={toast.id}>
              {toast.type === "success" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              )}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans select-none text-zinc-100 text-white bg-black">
      {/* Top Navbar */}
      <nav className="sticky top-0 left-0 right-0 h-16 bg-zinc-950/85 backdrop-blur-md border-b border-white/5 z-50 shadow-md">
        <div className="max-w-7xl mx-auto w-full h-full flex justify-between items-center px-8">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              O3 - Cloud Storage
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-xs font-semibold text-zinc-400 bg-white/5 border border-white/5 py-1.5 px-3.5 rounded-full">
              👤 {user?.email}
            </span>
            <button 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border border-white/10 hover:border-white/20 bg-transparent hover:bg-white/5 text-zinc-300 hover:text-white shadow-sm transition-all duration-200 cursor-pointer active:scale-95"
              onClick={() => setIsUploadModalOpen(true)}
            >
              Upload
            </button>
            <button 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm bg-zinc-900 border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/8 text-zinc-400 hover:text-rose-400 shadow-sm transition-all duration-200 cursor-pointer active:scale-95"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Grid View */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-6 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          My Files
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6 w-full">
          {files.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center text-center py-20 text-zinc-500 gap-3">
              <div className="opacity-40 text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <p className="text-base font-medium text-zinc-300">No files uploaded yet.</p>
              <span className="text-xs text-zinc-500">Click the "Upload" button at the top to add files to your drive.</span>
            </div>
          ) : (
            files.map((file) => (
              <div 
                className="aspect-square bg-zinc-900/65 border border-white/5 rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-sm relative group cursor-pointer hover:bg-zinc-900/85 hover:border-white/10 active:scale-[0.98] transition-all duration-200" 
                key={file.id}
                onClick={() => handlePreview(file)}
              >
                {/* Three-dot menu button */}
                <div className="absolute top-4 right-4 z-20">
                  <button
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border-none text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer transition-all duration-200"
                    title="More Actions"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDropdown((prev) => (prev === file.id ? null : file.id));
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"/>
                      <circle cx="12" cy="5" r="1"/>
                      <circle cx="12" cy="19" r="1"/>
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {activeDropdown === file.id && (
                    <div 
                      className="absolute right-0 mt-1 w-32 bg-zinc-950/95 backdrop-blur-md border border-white/5 rounded-xl shadow-xl overflow-hidden py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2 cursor-pointer transition-colors duration-150"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(null);
                          handleDownload(file);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 flex items-center gap-2 cursor-pointer transition-colors duration-150"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(null);
                          handleDelete(file.id, file.originalName);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="flex flex-col items-center gap-3 w-full mt-2">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-400 transition-all duration-200 group-hover:scale-105 group-hover:bg-indigo-500/10">
                    {getFileIcon(file.originalName)}
                  </div>
                  <span className="text-sm font-semibold text-zinc-200 w-full truncate px-1" title={file.originalName}>
                    {file.originalName}
                  </span>
                  <span className="text-[11px] text-zinc-500 w-full truncate">
                    {formatDate(file.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Upload Modal (Popup) */}
      {isUploadModalOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (!isUploading) {
              setIsUploadModalOpen(false);
              removeSelectedFile();
            }
          }}
        >
          <div 
            className="bg-zinc-900 border border-white/5 rounded-2xl w-full max-w-md p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal itself
          >
            <button 
              className="absolute top-4 right-4 bg-transparent border-none text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-all duration-200"
              onClick={() => {
                setIsUploadModalOpen(false);
                removeSelectedFile();
              }}
              disabled={isUploading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2.5 mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload File
            </h2>

            <form onSubmit={handleUpload}>
              <div 
                className={`border-2 border-dashed rounded-xl py-8 px-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                  dragActive 
                    ? "border-indigo-500/50 bg-indigo-500/5" 
                    : "border-indigo-500/20 hover:border-indigo-500/40 bg-white/[0.002] hover:bg-indigo-500/[0.02]"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current.click()}
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  style={{ display: "none" }} 
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <div className="text-3xl text-zinc-400 group-hover:text-purple-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p className="text-xs text-zinc-300 font-medium">Drag and drop a file, or click to browse</p>
                <span className="text-[10px] text-zinc-500">Supports files up to 100MB</span>
              </div>

              {selectedFile && (
                <div className="mt-4 p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between w-full">
                  <div className="text-xs font-semibold text-zinc-200 truncate max-w-[80%]" title={selectedFile.name}>
                    {selectedFile.name}
                  </div>
                  <button 
                    type="button" 
                    className="bg-transparent border-none text-rose-500 hover:bg-rose-500/10 p-1 rounded cursor-pointer transition-all duration-200 flex items-center justify-center"
                    onClick={removeSelectedFile}
                    disabled={isUploading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              )}

              {isUploading && (
                <div className="w-full mt-4">
                  <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-100" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {selectedFile && (
                <button 
                  type="submit" 
                  className="w-full mt-5 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading file..." : "Start Upload"}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={handleClosePreview}
        >
          <div 
            className="bg-zinc-950 border border-white/5 rounded-3xl w-full max-w-4xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
              <div className="flex items-center gap-3 truncate pr-4">
                <span className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  {getFileIcon(previewFile.originalName)}
                </span>
                <h3 className="text-base font-bold text-zinc-100 truncate" title={previewFile.originalName}>
                  {previewFile.originalName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-200 hover:text-white transition-all cursor-pointer"
                >
                  Download
                </button>
                <button 
                  className="bg-transparent border-none text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-all duration-200"
                  onClick={handleClosePreview}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto flex items-center justify-center min-h-[40vh] max-h-[70vh]">
              {isPreviewLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-semibold text-zinc-400">Loading preview...</span>
                </div>
              ) : (
                (() => {
                  const type = getFileType(previewFile.originalName);
                  if (type === "image") {
                    return (
                      <img 
                        src={previewUrl} 
                        alt={previewFile.originalName} 
                        className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-md"
                      />
                    );
                  }
                  if (type === "pdf") {
                    return (
                      <iframe 
                        src={previewUrl} 
                        title={previewFile.originalName} 
                        className="w-full h-[65vh] rounded-xl border border-white/5"
                      />
                    );
                  }
                  if (type === "audio") {
                    return (
                      <div className="flex flex-col items-center gap-4 w-full max-w-md p-6 bg-white/[0.01] border border-white/5 rounded-2xl">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-2xl animate-pulse">
                          🎵
                        </div>
                        <audio src={previewUrl} controls className="w-full" autoPlay />
                      </div>
                    );
                  }
                  if (type === "video") {
                    return (
                      <video 
                        src={previewUrl} 
                        controls 
                        className="max-h-[65vh] max-w-full rounded-xl"
                        autoPlay 
                      />
                    );
                  }
                  if (type === "text") {
                    return (
                      <pre className="w-full text-left bg-zinc-950 p-6 rounded-2xl text-xs font-mono text-zinc-300 overflow-auto max-h-[65vh] border border-white/5 whitespace-pre-wrap leading-relaxed">
                        {previewTextContent}
                      </pre>
                    );
                  }
                  return (
                    <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9" x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-zinc-200 font-bold mb-1">Preview Unavailable</h4>
                        <p className="text-xs text-zinc-500">In-app previewing is not supported for this file type.</p>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Messages */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
        {toasts.map((toast) => (
          <div className={`flex items-center gap-3 py-3 px-5 rounded-xl text-white text-sm font-semibold shadow-xl ${
            toast.type === "success" 
              ? "bg-gradient-to-r from-emerald-500 to-teal-600" 
              : "bg-gradient-to-r from-rose-500 to-red-600"
          }`} key={toast.id}>
            {toast.type === "success" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
