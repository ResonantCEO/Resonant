import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Camera, Search, Filter, Grid, List, FolderPlus, Folder, Plus, X, Check, Trash2, Download, Eye, MoreVertical, ArrowLeft, User, Image as ImageIcon, Wallpaper, Upload, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

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
  albumId?: number;
}

interface Album {
  id: number;
  profileId: number;
  name: string;
  description?: string;
  coverPhotoId?: number;
  createdAt: string;
  updatedAt: string;
}

interface FriendTagSearchProps {
  friends: any[];
  selectedFriends: number[];
  onSelectionChange: (selectedIds: number[]) => void;
}

function FriendTagSearch({ friends, selectedFriends, onSelectionChange }: FriendTagSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFriendNames = friends
    .filter(friend => selectedFriends.includes(friend.id))
    .map(friend => friend.name);

  const toggleFriend = (friendId: number) => {
    if (selectedFriends.includes(friendId)) {
      onSelectionChange(selectedFriends.filter(id => id !== friendId));
    } else {
      onSelectionChange([...selectedFriends, friendId]);
    }
  };

  const removeFriend = (friendId: number) => {
    onSelectionChange(selectedFriends.filter(id => id !== friendId));
  };

  return (
    <div className="space-y-2">
      {/* Selected friends display */}
      {selectedFriends.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedFriendNames.map((name, idx) => {
            const friendId = friends.find(f => f.name === name)?.id;
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full"
              >
                {name}
                <button
                  type="button"
                  onClick={() => friendId && removeFriend(friendId)}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search friends to tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="pl-10"
          />
        </div>

        {/* Dropdown results */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {friends.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                No friends to tag
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                No friends found matching "{searchQuery}"
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => toggleFriend(friend.id)}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                >
                  <div className="flex items-center space-x-2 flex-1">
                    {friend.profileImageUrl ? (
                      <img
                        src={friend.profileImageUrl}
                        alt={friend.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {friend.name}
                    </span>
                  </div>
                  {selectedFriends.includes(friend.id) && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
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
  const [uploadFriendTags, setUploadFriendTags] = useState<number[][]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<'albums' | 'photos' | 'album'>('albums');
  const [showCreateAlbumDialog, setShowCreateAlbumDialog] = useState(false);
  const [showEditAlbumDialog, setShowEditAlbumDialog] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumName, setAlbumName] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<number[]>([]);
  const [showAddToAlbumDialog, setShowAddToAlbumDialog] = useState(false);
  const [targetAlbumId, setTargetAlbumId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch photos for this profile
  const { data: photos = [], isLoading: photosLoading } = useQuery<Photo[]>({
    queryKey: [`/api/profiles/${profile?.id}/photos`],
    enabled: !!profile?.id,
  });

  // Fetch albums for this profile
  const { data: albums = [], isLoading: albumsLoading } = useQuery<Album[]>({
    queryKey: [`/api/profiles/${profile?.id}/albums`],
    enabled: !!profile?.id,
  });

  // Fetch photos for selected album
  const { data: albumPhotos = [], isLoading: albumPhotosLoading } = useQuery<Photo[]>({
    queryKey: [`/api/albums/${selectedAlbumId}/photos`],
    enabled: !!selectedAlbumId && currentView === 'album',
  });

  // Fetch friends for tagging
  const { data: friends = [] } = useQuery<any[]>({
    queryKey: [`/api/friends`],
    enabled: !!profile?.id,
  });

  const isLoading = photosLoading || albumsLoading || albumPhotosLoading;

  // Upload photos mutation
  const uploadPhotosMutation = useMutation({
    mutationFn: async (photosData: { files: File[]; captions: string[]; friendTags: number[][]; albumId?: number }) => {
      const formData = new FormData();
      photosData.files.forEach((file, index) => {
        formData.append('photos', file);
        formData.append(`caption_${index}`, photosData.captions[index] || '');
        formData.append(`friendTags_${index}`, JSON.stringify(photosData.friendTags[index] || []));
      });
      
      // Add album ID if we're in an album view
      if (photosData.albumId) {
        formData.append('albumId', photosData.albumId.toString());
      }

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
      if (selectedAlbumId) {
        queryClient.invalidateQueries({ queryKey: [`/api/albums/${selectedAlbumId}/photos`] });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/albums`] });
      setShowUploadDialog(false);
      setUploadFiles([]);
      setUploadCaptions([]);
      setUploadFriendTags([]);
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
      if (selectedAlbumId) {
        queryClient.invalidateQueries({ queryKey: [`/api/albums/${selectedAlbumId}/photos`] });
      }
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

  // Create album mutation
  const createAlbumMutation = useMutation({
    mutationFn: async (albumData: { name: string; description: string }) => {
      const response = await fetch(`/api/profiles/${profile.id}/albums`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(albumData),
      });
      if (!response.ok) throw new Error('Failed to create album');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/albums`] });
      setShowCreateAlbumDialog(false);
      setAlbumName('');
      setAlbumDescription('');
      toast({
        title: "Album created",
        description: "Your new album has been created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Create failed",
        description: error.message || "Failed to create album",
        variant: "destructive",
      });
    },
  });

  // Update album mutation
  const updateAlbumMutation = useMutation({
    mutationFn: async ({ albumId, ...albumData }: { albumId: number; name: string; description: string }) => {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(albumData),
      });
      if (!response.ok) throw new Error('Failed to update album');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/albums`] });
      setShowEditAlbumDialog(false);
      setEditingAlbum(null);
      toast({
        title: "Album updated",
        description: "Your album has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update album",
        variant: "destructive",
      });
    },
  });

  // Delete album mutation
  const deleteAlbumMutation = useMutation({
    mutationFn: async (albumId: number) => {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete album');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/albums`] });
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/photos`] });
      setCurrentView('albums');
      setSelectedAlbumId(null);
      toast({
        title: "Album deleted",
        description: "The album and its photos have been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete album",
        variant: "destructive",
      });
    },
  });

  // Add photos to album mutation
  const addPhotosToAlbumMutation = useMutation({
    mutationFn: async ({ albumId, photoIds }: { albumId: number; photoIds: number[] }) => {
      const response = await fetch(`/api/albums/${albumId}/photos`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds }),
      });
      if (!response.ok) throw new Error('Failed to add photos to album');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/photos`] });
      if (selectedAlbumId) {
        queryClient.invalidateQueries({ queryKey: [`/api/albums/${selectedAlbumId}/photos`] });
      }
      setShowAddToAlbumDialog(false);
      setSelectedPhotoIds([]);
      setTargetAlbumId(null);
      toast({
        title: "Photos added",
        description: "Photos have been added to the album.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Add failed",
        description: error.message || "Failed to add photos to album",
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
    setUploadFriendTags(new Array(validFiles.length).fill([]));
    setShowUploadDialog(true);
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const newCaptions = [...uploadCaptions];
    newCaptions[index] = caption;
    setUploadCaptions(newCaptions);
  };

  const handleFriendTagsChange = (index: number, friendId: number, checked: boolean) => {
    const newFriendTags = [...uploadFriendTags];
    if (!newFriendTags[index]) {
      newFriendTags[index] = [];
    }
    
    if (checked) {
      if (!newFriendTags[index].includes(friendId)) {
        newFriendTags[index] = [...newFriendTags[index], friendId];
      }
    } else {
      newFriendTags[index] = newFriendTags[index].filter(id => id !== friendId);
    }
    
    setUploadFriendTags(newFriendTags);
  };

  const handleUpload = () => {
    if (uploadFiles.length === 0) return;
    const albumIdToUse = currentView === 'album' && selectedAlbumId ? selectedAlbumId : undefined;
    console.log('Uploading photos with albumId:', albumIdToUse, 'currentView:', currentView, 'selectedAlbumId:', selectedAlbumId);
    uploadPhotosMutation.mutate({
      files: uploadFiles,
      captions: uploadCaptions,
      friendTags: uploadFriendTags,
      albumId: albumIdToUse
    });
  };

  const handleCreateAlbum = () => {
    if (!albumName.trim()) return;
    createAlbumMutation.mutate({
      name: albumName,
      description: albumDescription
    });
  };

  const handleEditAlbum = (album: Album) => {
    setEditingAlbum(album);
    setAlbumName(album.name);
    setAlbumDescription(album.description || '');
    setShowEditAlbumDialog(true);
  };

  const handleUpdateAlbum = () => {
    if (!editingAlbum || !albumName.trim()) return;
    updateAlbumMutation.mutate({
      albumId: editingAlbum.id,
      name: albumName,
      description: albumDescription
    });
  };

  const handleSelectAlbum = (album: Album) => {
    setSelectedAlbumId(album.id);
    setCurrentView('album');
  };

  const handleBackToAlbums = () => {
    setCurrentView('albums');
    setSelectedAlbumId(null);
    setSelectedPhotoIds([]);
  };

  const handleViewAllPhotos = () => {
    setCurrentView('photos');
    setSelectedAlbumId(null);
  };

  const togglePhotoSelection = (photoId: number) => {
    setSelectedPhotoIds(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const handleAddSelectedToAlbum = () => {
    if (selectedPhotoIds.length === 0 || !targetAlbumId) return;
    addPhotosToAlbumMutation.mutate({
      albumId: targetAlbumId,
      photoIds: selectedPhotoIds
    });
  };

  // Get current photos based on view
  const currentPhotos = currentView === 'album' ? albumPhotos : photos;

  // Filter and sort photos
  const filteredPhotos = currentPhotos
    .filter(photo => {
      if (searchTerm && !photo.caption?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterTag && !photo.tags.includes(filterTag)) {
        return false;
      }
      // If in photos view, show unalbumized photos or all photos
      if (currentView === 'photos') {
        return true; // Show all photos in the main photos view
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

  // Get photos not in any album for "add to album" functionality
  const unalbumedPhotos = photos.filter(photo => !photo.albumId);

  // Get currently selected album
  const selectedAlbum = albums.find(album => album.id === selectedAlbumId);

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
          <div className="flex items-center gap-3">
            {currentView !== 'albums' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToAlbums}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentView === 'albums' ? 'Albums' : 
                 currentView === 'album' ? selectedAlbum?.name || 'Album' : 'All Photos'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {currentView === 'albums' 
                  ? `${albums.length} ${albums.length === 1 ? 'album' : 'albums'}`
                  : `${filteredPhotos.length} ${filteredPhotos.length === 1 ? 'photo' : 'photos'}`
                }
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle buttons */}
          {currentView === 'albums' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewAllPhotos}
                className="flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                All Photos
              </Button>
              {isOwn && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateAlbumDialog(true)}
                  className="flex items-center gap-2"
                >
                  <FolderPlus className="w-4 h-4" />
                  New Album
                </Button>
              )}
            </div>
          )}

          {/* Search and filters - only show for photos view */}
          {currentView !== 'albums' && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search photos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>

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

              {/* Photo management buttons */}
              {isOwn && currentView === 'photos' && selectedPhotoIds.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddToAlbumDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add to Album
                </Button>
              )}
            </>
          )}

          {/* Upload button */}
          {isOwn && currentView !== 'albums' && (
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

      {/* Album Description - Show when viewing a specific album */}
      {currentView === 'album' && selectedAlbum && (selectedAlbum.description || isOwn) && (
        <div className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6 mb-6">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {isOwn ? (
                  <Input
                    value={selectedAlbum.name}
                    onChange={(e) => {
                      // Update album name locally for immediate feedback
                      const updatedAlbum = { ...selectedAlbum, name: e.target.value };
                      // You might want to add debounced save here
                    }}
                    onBlur={(e) => {
                      if (e.target.value !== selectedAlbum.name) {
                        updateAlbumMutation.mutate({
                          albumId: selectedAlbum.id,
                          name: e.target.value,
                          description: selectedAlbum.description || ''
                        });
                      }
                    }}
                    className="text-lg font-semibold bg-transparent border-none p-0 h-auto text-gray-900 dark:text-white hover:bg-gray-100/50 dark:hover:bg-gray-800/50 focus:bg-gray-100/50 dark:focus:bg-gray-800/50"
                    placeholder="Album title..."
                  />
                ) : (
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedAlbum.name}</h3>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Created {new Date(selectedAlbum.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {isOwn ? (
                <Textarea
                  value={selectedAlbum.description || ''}
                  onChange={(e) => {
                    // Update album description locally for immediate feedback
                    const updatedAlbum = { ...selectedAlbum, description: e.target.value };
                    // You might want to add debounced save here
                  }}
                  onBlur={(e) => {
                    if (e.target.value !== (selectedAlbum.description || '')) {
                      updateAlbumMutation.mutate({
                        albumId: selectedAlbum.id,
                        name: selectedAlbum.name,
                        description: e.target.value
                      });
                    }
                  }}
                  placeholder="Add a description for this album..."
                  className="min-h-[80px] bg-transparent border-none p-0 text-gray-700 dark:text-gray-300 resize-none hover:bg-gray-100/50 dark:hover:bg-gray-800/50 focus:bg-gray-100/50 dark:focus:bg-gray-800/50"
                  rows={3}
                />
              ) : selectedAlbum.description ? (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {selectedAlbum.description}
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">No description available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Albums Grid */}
      {currentView === 'albums' && (
        <>
          {albums.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No albums yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {isOwn 
                  ? 'Create your first album to organize your photos'
                  : 'This user hasn\'t created any albums yet'
                }
              </p>
              {isOwn && (
                <Button
                  onClick={() => setShowCreateAlbumDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  <FolderPlus className="w-4 h-4 mr-2 font-bold" />
                  Create Album
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {albums.map((album) => {
                const albumPhotoCount = photos.filter(p => p.albumId === album.id).length;
                const coverPhoto = photos.find(p => p.id === album.coverPhotoId) || 
                                   photos.find(p => p.albumId === album.id);

                const isDefaultAlbum = ['Profile Pictures', 'Cover Photos', 'Background Pictures'].includes(album.name);

                return (
                  <div
                    key={album.id}
                    className={`group rounded-lg shadow-sm hover:shadow-md transition-shadow relative ${
                      isDefaultAlbum 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                        : 'bg-white dark:bg-gray-800'
                    }`}
                  >
                    {/* Album management buttons for non-default albums */}
                    {isOwn && !isDefaultAlbum && (
                      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditAlbum(album);
                          }}
                          className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete "${album.name}"? This will also remove all photos in the album.`)) {
                              deleteAlbumMutation.mutate(album.id);
                            }
                          }}
                          disabled={deleteAlbumMutation.isPending}
                          className="h-8 w-8 p-0 bg-red-500/90 hover:bg-red-600 shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    <div 
                      className="cursor-pointer"
                      onClick={() => handleSelectAlbum(album)}
                    >
                      <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-t-lg overflow-hidden relative">
                        {coverPhoto ? (
                          <img
                            src={coverPhoto.imageUrl}
                            alt={album.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {isDefaultAlbum ? (
                              album.name === 'Profile Pictures' ? (
                                <User className="w-12 h-12 text-blue-400" />
                              ) : album.name === 'Cover Photos' ? (
                                <ImageIcon className="w-12 h-12 text-blue-400" />
                              ) : (
                                <Wallpaper className="w-12 h-12 text-blue-400" />
                              )
                            ) : (
                              <Camera className="w-12 h-12 text-gray-400" />
                            )}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
                      </div>
                      <div className="p-4">
                        <h3 className={`font-medium text-sm mb-1 ${
                          isDefaultAlbum ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
                        }`}>
                          {album.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {albumPhotoCount} {albumPhotoCount === 1 ? 'photo' : 'photos'}
                        </p>
                        {album.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                            {album.description.length > 100 
                              ? `${album.description.substring(0, 100)}...` 
                              : album.description
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Photo Grid/List */}
      {currentView !== 'albums' && (
        <>
          {filteredPhotos.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {currentPhotos.length === 0 ? 'No photos yet' : 'No photos match your search'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {isOwn 
                  ? currentPhotos.length === 0 
                    ? 'Start building your gallery by uploading your first photo'
                    : 'Try adjusting your search or filter criteria'
                  : 'This gallery is empty'
                }
              </p>
              {isOwn && currentPhotos.length === 0 && (
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
                  className={`group relative ${
                    viewMode === 'grid'
                      ? "aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden"
                      : "flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border"
                  }`}
                >
                  {/* Selection checkbox for photos view */}
                  {isOwn && currentView === 'photos' && viewMode === 'grid' && (
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedPhotoIds.includes(photo.id)}
                        onCheckedChange={() => togglePhotoSelection(photo.id)}
                        className="bg-white border-gray-300"
                      />
                    </div>
                  )}

                  <div 
                    className="cursor-pointer w-full h-full"
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
                        <div className="flex items-center gap-2">
                          {isOwn && currentView === 'photos' && (
                            <Checkbox
                              checked={selectedPhotoIds.includes(photo.id)}
                              onCheckedChange={() => togglePhotoSelection(photo.id)}
                            />
                          )}
                          <div className="flex-1">
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
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tag Friends (optional)
                      </label>
                      <FriendTagSearch
                        friends={friends}
                        selectedFriends={uploadFriendTags[index] || []}
                        onSelectionChange={(selectedIds) => {
                          const newFriendTags = [...uploadFriendTags];
                          newFriendTags[index] = selectedIds;
                          setUploadFriendTags(newFriendTags);
                        }}
                      />
                    </div>
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

      {/* Create Album Dialog */}
      <Dialog open={showCreateAlbumDialog} onOpenChange={setShowCreateAlbumDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Album</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Album Name</label>
              <Input
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                placeholder="Enter album name..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description (optional)</label>
              <Textarea
                value={albumDescription}
                onChange={(e) => setAlbumDescription(e.target.value)}
                placeholder="Enter album description..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAlbumDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAlbum}
              disabled={!albumName.trim() || createAlbumMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createAlbumMutation.isPending ? 'Creating...' : 'Create Album'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Album Dialog */}
      <Dialog open={showEditAlbumDialog} onOpenChange={setShowEditAlbumDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Album</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Album Name</label>
              <Input
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                placeholder="Enter album name..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description (optional)</label>
              <Textarea
                value={albumDescription}
                onChange={(e) => setAlbumDescription(e.target.value)}
                placeholder="Enter album description..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditAlbumDialog(false)}>
              Cancel
            </Button>
            {editingAlbum && !['Profile Pictures', 'Cover Photos', 'Background Pictures'].includes(editingAlbum.name) && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete "${editingAlbum.name}"? This will also remove all photos in the album.`)) {
                    deleteAlbumMutation.mutate(editingAlbum.id);
                  }
                }}
                disabled={deleteAlbumMutation.isPending}
              >
                {deleteAlbumMutation.isPending ? 'Deleting...' : 'Delete Album'}
              </Button>
            )}
            <Button
              onClick={handleUpdateAlbum}
              disabled={!albumName.trim() || updateAlbumMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {updateAlbumMutation.isPending ? 'Updating...' : 'Update Album'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Album Dialog */}
      <Dialog open={showAddToAlbumDialog} onOpenChange={setShowAddToAlbumDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Photos to Album</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select an album to add {selectedPhotoIds.length} selected {selectedPhotoIds.length === 1 ? 'photo' : 'photos'} to:
            </p>
            <Select value={targetAlbumId?.toString() || ''} onValueChange={(value) => setTargetAlbumId(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select an album..." />
              </SelectTrigger>
              <SelectContent>
                {albums.map(album => (
                  <SelectItem key={album.id} value={album.id.toString()}>
                    {album.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddToAlbumDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedToAlbum}
              disabled={!targetAlbumId || addPhotosToAlbumMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {addPhotosToAlbumMutation.isPending ? 'Adding...' : 'Add to Album'}
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