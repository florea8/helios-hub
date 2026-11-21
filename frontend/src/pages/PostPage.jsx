import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

// One post with its replies open. Notifications about likes and replies link here.
const PostPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/api/posts/${postId}`)
      .then(({ data }) => setPost(data))
      .catch((err) =>
        setError(err.response?.status === 404 ? 'missing' : errorMessage(err, 'Could not load the post.'))
      );
  }, [postId]);

  const toggleLike = async () => {
    const liked = post.user_liked;
    try {
      await api[liked ? 'delete' : 'post'](`/api/posts/${post.id}/like`);
      setPost({ ...post, user_liked: liked ? 0 : 1, like_count: post.like_count + (liked ? -1 : 1) });
    } catch (err) {
      setError(errorMessage(err, 'Could not update the like.'));
    }
  };

  return (
    <Layout>
      <div className="wrap post-page">
        <Link to="/dashboard" className="link">
          Back to the feed
        </Link>
        {error === 'missing' ? (
          <EmptyState title="This post is gone" message="Its author may have deleted it." />
        ) : error ? (
          <div className="notice notice-error" role="alert">
            {error}
          </div>
        ) : !post ? (
          <LoadingSkeleton count={1} />
        ) : (
          <PostCard post={post} onLike={toggleLike} onChange={setPost} onDelete={() => navigate('/dashboard')} openReplies />
        )}
      </div>
    </Layout>
  );
};

export default PostPage;
