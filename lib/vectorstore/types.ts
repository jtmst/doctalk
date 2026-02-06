export interface ChunkMetadata {
  fileId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  chunkIndex: number;
  totalChunks: number;
  folderId: string;
  pageNumbers?: number[];
}

export interface ChunkWithMetadata {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

export interface SearchResult {
  id: string;
  score: number;
  text: string;
  metadata: ChunkMetadata;
}
