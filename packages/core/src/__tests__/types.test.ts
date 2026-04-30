import { describe, it, expect } from 'vitest';
import type { GitHubConfig, HexoPost, GitHubRepoConfig } from '../types';

describe('Types', () => {
  describe('GitHubConfig', () => {
    it('should accept required fields only', () => {
      const config: GitHubConfig = { owner: 'user', repo: 'blog' };
      expect(config.owner).toBe('user');
      expect(config.repo).toBe('blog');
      expect(config.branch).toBeUndefined();
    });

    it('should accept all optional fields', () => {
      const config: GitHubConfig = {
        owner: 'user',
        repo: 'blog',
        branch: 'main',
        postsDir: 'source/_posts',
        mediaDir: 'source/images',
      };
      expect(config.branch).toBe('main');
      expect(config.postsDir).toBe('source/_posts');
      expect(config.mediaDir).toBe('source/images');
    });
  });

  describe('HexoPost', () => {
    it('should accept all required fields', () => {
      const post: HexoPost = {
        path: 'source/_posts/hello.md',
        title: 'Hello World',
        date: '2024-01-01',
        content: '# Hello\n\nContent here',
        frontmatter: { title: 'Hello World', date: '2024-01-01' },
      };
      expect(post.path).toBe('source/_posts/hello.md');
      expect(post.title).toBe('Hello World');
      expect(post.frontmatter.title).toBe('Hello World');
    });

    it('should allow arbitrary frontmatter fields', () => {
      const post: HexoPost = {
        path: 'source/_posts/test.md',
        title: 'Test',
        date: '2024-01-01',
        content: '',
        frontmatter: {
          title: 'Test',
          tags: ['react', 'typescript'],
          categories: ['tech'],
          draft: true,
          custom_field: 'value',
        },
      };
      expect(post.frontmatter.tags).toEqual(['react', 'typescript']);
      expect(post.frontmatter.draft).toBe(true);
      expect(post.frontmatter.custom_field).toBe('value');
    });
  });

  describe('GitHubRepoConfig', () => {
    it('should extend GitHubConfig with optional fields', () => {
      const config: GitHubRepoConfig = {
        owner: 'user',
        repo: 'blog',
        workflowFile: 'deploy.yml',
        autoDeploy: true,
        deployNotifications: false,
      };
      expect(config.workflowFile).toBe('deploy.yml');
      expect(config.autoDeploy).toBe(true);
      expect(config.deployNotifications).toBe(false);
    });
  });
});
