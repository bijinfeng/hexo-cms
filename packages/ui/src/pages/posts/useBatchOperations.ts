import { useState } from "react";
import { useDataProvider } from "../../context/data-provider-context";
import type { PostDisplayItem } from "./usePostsFilter";

export function useBatchOperations(posts: PostDisplayItem[], loadPosts: () => Promise<void>) {
  const dataProvider = useDataProvider();
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const toggleSelectAll = (filtered: PostDisplayItem[]) => {
    if (selectedPosts.size === filtered.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(filtered.map((p) => p.id)));
    }
  };

  const toggleSelectPost = (postId: string) => {
    const next = new Set(selectedPosts);
    if (next.has(postId)) next.delete(postId);
    else next.add(postId);
    setSelectedPosts(next);
  };

  const selectedPostsData = posts.filter((p) => selectedPosts.has(p.id));
  const selectedDrafts = selectedPostsData.filter((p) => p.status === "draft");
  const selectedPublished = selectedPostsData.filter((p) => p.status === "published");

  const handleBatchDelete = async (setError: (msg: string) => void) => {
    const postsToDelete = posts.filter((p) => selectedPosts.has(p.id));
    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: postsToDelete.length });
    setError("");

    let successCount = 0;
    const failedPosts: string[] = [];

    for (let i = 0; i < postsToDelete.length; i++) {
      const post = postsToDelete[i];
      try {
        await dataProvider.deletePost(post.path);
        successCount++;
      } catch {
        failedPosts.push(post.title);
      }
      setBatchProgress({ current: i + 1, total: postsToDelete.length });
    }

    await loadPosts();
    setBatchProcessing(false);
    setBatchProgress(null);
    setSelectedPosts(new Set());

    if (failedPosts.length > 0) {
      setError(`删除完成，${successCount} 篇成功，${failedPosts.length} 篇失败：${failedPosts.join(", ")}`);
    }
  };

  const handleBatchPublish = async (publish: boolean, setError: (msg: string) => void) => {
    const postsToUpdate = posts.filter((p) => selectedPosts.has(p.id));
    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: postsToUpdate.length });
    setError("");

    let successCount = 0;
    const failedPosts: string[] = [];

    for (let i = 0; i < postsToUpdate.length; i++) {
      const post = postsToUpdate[i];
      try {
        const fullPost = await dataProvider.getPost(post.path);
        const updatedPost = {
          ...fullPost,
          frontmatter: { ...fullPost.frontmatter, draft: !publish },
        };
        await dataProvider.savePost(updatedPost);
        successCount++;
      } catch {
        failedPosts.push(post.title);
      }
      setBatchProgress({ current: i + 1, total: postsToUpdate.length });
    }

    await loadPosts();
    setBatchProcessing(false);
    setBatchProgress(null);
    setSelectedPosts(new Set());

    if (failedPosts.length > 0) {
      setError(`操作完成，${successCount} 篇成功，${failedPosts.length} 篇失败：${failedPosts.join(", ")}`);
    }
  };

  return {
    selectedPosts, setSelectedPosts,
    batchProcessing, batchProgress,
    selectedPostsData, selectedDrafts, selectedPublished,
    toggleSelectAll, toggleSelectPost,
    handleBatchDelete, handleBatchPublish,
  };
}
