
import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, X, Download, Trash2, Eye, Grid, List, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GalleryTabProps {
  profile: any;
  isOwn: boolean;
}

interface Photo {
  id: number;
  imageUrl: string;
  caption?: string;
  tags: string[];
  createdAt: string;
  profileId: number;
}

export default function GalleryTab({ profile, isOwn }: GalleryTabProps) {
  const { toast } = useToast();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'caption'>('newest');
  const [filterTag, setFilterTag] = useState<string>('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCaptions, setUploadCaptions] = useState<string[]>([]);
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch photos for this profile
  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: [`/api/profiles/${profile?.id}/photos`],
    enabled: !!profile?.id,
  });

  // Upload photos mutation
  const uploadPhotosMutation = useMutation({
    mutationFn: async (photosData: { files: File[]; captions: string[]; tags: string[] }) => {
      const formData = new FormData();
      photosData.files.forEach((file, index) => {
        formData.append('photos', file);
        formData.append(`caption_${index}`, photosData.captions[index] || '');
        formData.append(`tags_${index}`, JSON.stringify(photosData.tags[index] || []));
      });
      
      const response = await fetch(`/api/profiles/${profile.id}/photos`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to upload photos');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/photos`] });
      setShowUploadDialog(false);
      setUploadFiles([]);
      setUploadCaptions([]);
      setUploadTags([]);
      toast({
        title: "Photos uploaded",
        description: "Your photos have been added to the gallery.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photos",
        variant: "destructive",
      });
    },
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete photo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/photos`] });
      setSelectedPhoto(null);
      toast({
        title: "Photo deleted",
        description: "The photo has been removed from your gallery.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete photo",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Only image files are allowed.",
        variant: "destructive",
      });
    }
    
    setUploadFiles(validFiles);
    setUploadCaptions(new Array(validFiles.length).fill(''));
    setUploadTags(new Array(validFiles.length).fill([]));
    setShowUploadDialog(true);
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const newCaptions = [...uploadCaptions];
    newCaptions[index] = caption;
    setUploadCaptions(newCaptions);
  };

  const handleTagsChange = (index: number, tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    const newTags = [...uploadTags];
    newTags[index] = tags;
    setUploadTags(newTags);
  };

  const handleUpload = () => {
    if (uploadFiles.length === 0) return;
    uploadPhotosMutation.mutate({
      files: uploadFiles,
      captions: uploadCaptions,
      tags: uploadTags
    });
  };

  // Filter and sort photos
  const filteredPhotos = photos
    .filter(photo => {
      if (searchTerm && !photo.caption?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterTag && !photo.tags.includes(filterTag)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'caption':
          return (a.caption || '').localeCompare(b.caption || '');
        default:
          return 0;
      }
    });

  // Get all unique tags
  const allTags = Array.from(new Set(photos.flatMap(photo => photo.tags)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gallery
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search photos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-48"
            />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="caption">Caption</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter by tag */}
          {allTags.length > 0 && (
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-32">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* View mode */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-2"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-2"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Upload button */}
          {isOwn && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              <Upload className="w-4 h-4 mr-2 font-bold" />
              Upload
            </Button>
          )}
        </div>
      </div>

      {/* Photo Grid/List */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {photos.length === 0 ? 'No photos yet' : 'No photos match your search'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {isOwn 
              ? photos.length === 0 
                ? 'Start building your gallery by uploading your first photo'
                : 'Try adjusting your search or filter criteria'
              : 'This gallery is empty'
            }
          </p>
          {isOwn && photos.length === 0 && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              <Upload className="w-4 h-4 mr-2 font-bold" />
              Upload Photos
            </Button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            : "space-y-4"
        }>
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className={`group cursor-pointer ${
                viewMode === 'grid'
                  ? "aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative"
                  : "flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border"
              }`}
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.imageUrl}
                alt={photo.caption || 'Gallery photo'}
                className={
                  viewMode === 'grid'
                    ? "w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    : "w-16 h-16 object-cover rounded-lg"
                }
              />
              
              {viewMode === 'grid' ? (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {photo.caption || 'Untitled'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(photo.createdAt).toLocaleDateString()}
                  </p>
                  {photo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {photo.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {photo.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{photo.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo Detail Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedPhoto.caption || 'Untitled'}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(selectedPhoto.imageUrl, '_blank')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {isOwn && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePhotoMutation.mutate(selectedPhoto.id)}
                        disabled={deletePhotoMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="flex flex-col space-y-4 max-h-[calc(90vh-8rem)] overflow-auto">
                <img
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.caption || 'Gallery photo'}
                  className="w-full max-h-96 object-contain rounded-lg"
                />
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Uploaded on {new Date(selectedPhoto.createdAt).toLocaleDateString()}
                  </p>
                  
                  {selectedPhoto.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedPhoto.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Upload Photos</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[calc(90vh-12rem)] overflow-auto">
            {uploadFiles.map((file, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Upload preview ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Add a caption (optional)"
                      value={uploadCaptions[index] || ''}
                      onChange={(e) => handleCaptionChange(index, e.target.value)}
                    />
                    <Input
                      placeholder="Add tags separated by commas (optional)"
                      value={uploadTags[index]?.join(', ') || ''}
                      onChange={(e) => handleTagsChange(index, e.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newFiles = uploadFiles.filter((_, i) => i !== index);
                      const newCaptions = uploadCaptions.filter((_, i) => i !== index);
                      const newTags = uploadTags.filter((_, i) => i !== index);
                      setUploadFiles(newFiles);
                      setUploadCaptions(newCaptions);
                      setUploadTags(newTags);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadPhotosMutation.isPending || uploadFiles.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {uploadPhotosMutation.isPending ? 'Uploading...' : `Upload ${uploadFiles.length} Photo${uploadFiles.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
