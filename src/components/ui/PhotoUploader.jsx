import React, { useRef } from "react";
import { Camera, X, Plus } from "lucide-react";

export default function PhotoUploader({ photos, setPhotos, maxPhotos = 5 }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = React.useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push(file_url);
    }
    setPhotos([...photos, ...uploaded].slice(0, maxPhotos));
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removePhoto = (idx) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {photos.map((url, idx) => (
          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removePhoto(idx)}
              className="absolute top-1.5 right-1.5 bg-black/50 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
          >
            {uploading ? (
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : photos.length === 0 ? (
              <>
                <Camera className="w-6 h-6" />
                <span className="text-[10px] font-medium">Add Photos</span>
              </>
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}