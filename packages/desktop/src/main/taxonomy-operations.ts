import type { HexoPost } from "@hexo-cms/core";

export type TaxonomyType = "tag" | "category";

export interface TaxonomyRepository {
  getPosts(): Promise<HexoPost[]>;
  savePost(post: HexoPost): Promise<void>;
}

export interface TaxonomyMutation {
  type: TaxonomyType;
  oldName: string;
  newName: string;
}

export interface TaxonomyDeleteInput {
  type: TaxonomyType;
  name: string;
}

export interface TaxonomyMergeInput {
  type: TaxonomyType;
  sourceName: string;
  targetName: string;
}

export interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface TaxonomySummary {
  tags: TaxonomyItem[];
  categories: TaxonomyItem[];
  total: number;
}

export async function getTaxonomySummary(repository: Pick<TaxonomyRepository, "getPosts">): Promise<TaxonomySummary> {
  return summarizeTaxonomies(await repository.getPosts());
}

export async function renameTaxonomy(
  repository: TaxonomyRepository,
  mutation: TaxonomyMutation,
): Promise<{ updatedCount: number }> {
  const posts = await repository.getPosts();
  let updatedCount = 0;

  for (const post of posts) {
    const nextPost = renamePostTaxonomy(post, mutation);
    if (nextPost) {
      await repository.savePost(nextPost);
      updatedCount++;
    }
  }

  return { updatedCount };
}

export async function deleteTaxonomy(
  repository: TaxonomyRepository,
  input: TaxonomyDeleteInput,
): Promise<{ updatedCount: number }> {
  const posts = await repository.getPosts();
  let updatedCount = 0;

  for (const post of posts) {
    const nextPost = deletePostTaxonomy(post, input);
    if (nextPost) {
      await repository.savePost(nextPost);
      updatedCount++;
    }
  }

  return { updatedCount };
}

export function summarizeTaxonomies(posts: HexoPost[]): TaxonomySummary {
  const tagMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();

  for (const post of posts) {
    const tags = post.frontmatter.tags;
    if (Array.isArray(tags)) {
      for (const tag of tags) tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    } else if (typeof tags === "string" && tags) {
      tagMap.set(tags, (tagMap.get(tags) || 0) + 1);
    }

    const category = post.frontmatter.category || post.frontmatter.categories;
    if (typeof category === "string" && category) {
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    } else if (Array.isArray(category)) {
      for (const cat of category) {
        if (typeof cat === "string") categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      }
    }
  }

  return {
    tags: toTaxonomyItems(tagMap),
    categories: toTaxonomyItems(categoryMap),
    total: posts.length,
  };
}

export function renamePostTaxonomy(post: HexoPost, { type, oldName, newName }: TaxonomyMutation): HexoPost | null {
  let changed = false;
  const frontmatter = { ...post.frontmatter };

  if (type === "tag") {
    if (Array.isArray(frontmatter.tags)) {
      const index = frontmatter.tags.indexOf(oldName);
      if (index !== -1) {
        frontmatter.tags = [...frontmatter.tags];
        frontmatter.tags[index] = newName;
        changed = true;
      }
    } else if (frontmatter.tags === oldName) {
      frontmatter.tags = newName;
      changed = true;
    }
  } else {
    if (frontmatter.category === oldName) {
      frontmatter.category = newName;
      changed = true;
    }
    if (frontmatter.categories === oldName) {
      frontmatter.categories = newName;
      changed = true;
    }
  }

  return changed ? { ...post, frontmatter } : null;
}

export function deletePostTaxonomy(post: HexoPost, { type, name }: TaxonomyDeleteInput): HexoPost | null {
  let changed = false;
  const frontmatter = { ...post.frontmatter };

  if (type === "tag") {
    if (Array.isArray(frontmatter.tags)) {
      const filtered = frontmatter.tags.filter((tag) => tag !== name);
      if (filtered.length !== frontmatter.tags.length) {
        frontmatter.tags = filtered;
        changed = true;
      }
    } else if (frontmatter.tags === name) {
      frontmatter.tags = [];
      changed = true;
    }
  } else {
    if (frontmatter.category === name) {
      delete frontmatter.category;
      changed = true;
    }
    if (frontmatter.categories === name) {
      delete frontmatter.categories;
      changed = true;
    }
  }

  return changed ? { ...post, frontmatter } : null;
}

export async function mergeTaxonomy(
  repository: TaxonomyRepository,
  input: TaxonomyMergeInput,
): Promise<{ updatedCount: number }> {
  const posts = await repository.getPosts();
  let updatedCount = 0;

  for (const post of posts) {
    const next = mergePostTaxonomy(post, input);
    if (next) {
      await repository.savePost(next);
      updatedCount += 1;
    }
  }

  return { updatedCount };
}

export function mergePostTaxonomy(post: HexoPost, { type, sourceName, targetName }: TaxonomyMergeInput): HexoPost | null {
  let changed = false;
  const frontmatter = { ...post.frontmatter };

  function mergeField(fieldName: "tags" | "category" | "categories") {
    const value = frontmatter[fieldName];
    if (Array.isArray(value)) {
      const idx = value.indexOf(sourceName);
      if (idx === -1) return;
      changed = true;
      const filtered: string[] = value.filter((t) => t !== sourceName);
      if (!filtered.includes(targetName)) filtered.push(targetName);
      (frontmatter as Record<string, unknown>)[fieldName] = filtered;
    } else if (value === sourceName) {
      changed = true;
      (frontmatter as Record<string, unknown>)[fieldName] = targetName;
    }
  }

  if (type === "tag") {
    mergeField("tags");
  } else {
    mergeField("category");
    mergeField("categories");
  }

  if (!changed) return null;
  return { ...post, frontmatter };
}

function toTaxonomyItems(map: Map<string, number>): TaxonomyItem[] {
  return Array.from(map.entries())
    .map(([name, count], index) => ({ id: String(index + 1), name, slug: name.toLowerCase().replace(/\s+/g, "-"), count }))
    .sort((left, right) => right.count - left.count);
}
