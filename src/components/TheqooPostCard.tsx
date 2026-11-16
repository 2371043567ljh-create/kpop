import React from 'react';
import { Flame, MessageSquare, ThumbsUp } from 'lucide-react';
import type { TheqooPost } from '../game/types';

interface TheqooPostCardProps {
  post: TheqooPost;
}

export const TheqooPostCard: React.FC<TheqooPostCardProps> = ({ post }) => {
  return (
    <section
      aria-label="韩网热帖路透讨论区"
      className="bg-[#11121B] border border-slate-700/75 rounded-xl overflow-hidden shadow-lg"
    >
      {/* Forum header bar */}
      <div className="px-5 py-3.5 bg-[#171926] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-purple-300">
          <Flame className="w-4 h-4 text-purple-400" />
          <span>{post.boardName}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-400 font-normal">{post.highlightTag}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono-tabular">
          <span>{post.timestamp}</span>
          <span aria-hidden="true">·</span>
          <span>浏览 {post.views}</span>
        </div>
      </div>

      {/* Post content */}
      <div className="p-5 sm:p-6 space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
          {post.postTitle}
        </h3>
        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-[#0B0C13] border border-slate-800/80 rounded-lg p-4">
          {post.postBody}
        </div>

        {/* Comments list */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>热门实时跟帖（{post.comments.length} 条精选）</span>
          </div>

          <div className="divide-y divide-slate-800/80 border border-slate-800/80 rounded-lg bg-[#0D0E16]">
            {post.comments.map((comment) => (
              <div key={comment.id} className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className={comment.isTop ? 'font-semibold text-purple-300' : 'text-slate-400'}>
                    {comment.author}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-400 font-mono-tabular">
                    <ThumbsUp className="w-3 h-3" />
                    <span>{comment.likes}</span>
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
