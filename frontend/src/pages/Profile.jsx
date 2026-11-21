import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Avatar from '../components/Avatar';
import Dialog from '../components/Dialog';
import InterestTag from '../components/InterestTag';
import TagPicker from '../components/TagPicker';
import PostCard from '../components/PostCard';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { formatDate } from '../utils/time';
import '../styles/Profile.css';

const LINKS = [
  ['website', 'Website'],
  ['github_url', 'GitHub'],
  ['linkedin_url', 'LinkedIn'],
  ['twitter_url', 'X / Twitter'],
];

const FRIEND_BUTTON = {
  none: 'Add friend',
  request_sent: 'Request sent',
  request_received: 'Answer request',
  friend: 'Friends',
};

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const ProfilePage = () => {
  const { userId } = useParams();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const id = Number(userId) || user?.id;
  const own = id === user?.id;
  const [profile, setProfile] = useState(null);
  const [hidden, setHidden] = useState(false); // private profile of someone else
  const [posts, setPosts] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [tab, setTab] = useState('posts');
  const [friendship, setFriendship] = useState(null);
  const [form, setForm] = useState(null); // edit form, null while closed
  const [allTags, setAllTags] = useState([]);
  const [error, setError] = useState('');
  const fail = useCallback((fallback) => (err) => setError(errorMessage(err, fallback)), []);

  useEffect(() => {
    if (Number(userId) === user.id) navigate('/profile', { replace: true });
  }, [user, userId, navigate]);

  useEffect(() => {
    if (!id) return;
    let stale = false;
    Promise.all([
      api.get(`/api/profile/${id}`).catch((err) => {
        if (err.response?.status === 403) return null;
        throw err;
      }),
      // Rooms have their own tab, so the posts they create are left out here.
      api.get(`/api/posts?author=${id}&type=standard&limit=50`),
      api.get(`/api/rooms?member=${id}`),
    ])
      .then(([details, authored, joined]) => {
        if (stale) return;
        setProfile(details?.data || null);
        setHidden(!details);
        setPosts(authored.data.posts);
        setRooms(joined.data);
      })
      .catch(fail('Could not load the profile.'));
    return () => {
      stale = true;
    };
  }, [id, fail]);

  // There is no endpoint for one friendship, so search for the exact name and pick this person.
  useEffect(() => {
    if (own || !profile) return;
    api
      .get(`/api/friends/search?query=${encodeURIComponent(profile.username)}`)
      .then(({ data }) => setFriendship(data.find((person) => person.id === id)?.friendship_status || 'none'))
      .catch(() => setFriendship(null));
  }, [own, profile, id]);

  const befriend = async () => {
    if (friendship === 'request_received') return navigate('/friends');
    try {
      await api.post('/api/friends/request', { friendId: id });
      setFriendship('request_sent');
    } catch (err) {
      fail('Could not send the request.')(err);
    }
  };

  const changePicture = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { data } = await api.post('/api/auth/upload-profile-picture', { file: await readFile(file) });
      setProfile((prev) => ({ ...prev, profile_picture: data.profile_picture }));
      updateUser({ profile_picture: data.profile_picture });
    } catch (err) {
      fail('Could not change the picture.')(err);
    }
  };

  const openEditor = () => {
    setForm({
      bio: profile.bio || '',
      location: profile.location || '',
      ...Object.fromEntries(LINKS.map(([key]) => [key, profile[key] || ''])),
      is_profile_public: profile.is_profile_public !== 0,
      interests: profile.interests.map((tag) => tag.id),
    });
    if (!allTags.length) api.get('/api/tags').then(({ data }) => setAllTags(data)).catch(fail('Could not load the interests.'));
  };

  // Adds an interest nobody has created yet, so the picker can select it.
  const createTag = async (name) => {
    try {
      const { data: tag } = await api.post('/api/tags', { name });
      setAllTags((prev) =>
        prev.some((t) => t.id === tag.id) ? prev : [...prev, tag].sort((a, b) => a.name.localeCompare(b.name))
      );
      return tag;
    } catch (err) {
      fail('Could not add the interest.')(err);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    const { interests, ...details } = form;
    try {
      const [, picked] = await Promise.all([
        api.put('/api/profile/update', details),
        api.put('/api/profile/interests', { tags: interests }),
      ]);
      const saved = { ...details, is_profile_public: details.is_profile_public ? 1 : 0, interests: picked.data.interests };
      setProfile((prev) => ({ ...prev, ...saved }));
      updateUser(saved);
      setForm(null);
    } catch (err) {
      fail('Could not save your profile.')(err);
    }
  };

  const toggleLike = async (postId) => {
    const liked = posts.find((post) => post.id === postId)?.user_liked;
    try {
      await api[liked ? 'delete' : 'post'](`/api/posts/${postId}/like`);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, user_liked: liked ? 0 : 1, like_count: post.like_count + (liked ? -1 : 1) }
            : post
        )
      );
    } catch (err) {
      fail('Could not update the like.')(err);
    }
  };

  const links = profile ? LINKS.filter(([key]) => profile[key]) : [];
  const joined = profile && formatDate(profile.created_at, { month: 'long', year: 'numeric' });
  const field = (key) => ({ value: form[key], onChange: (e) => setForm({ ...form, [key]: e.target.value }) });

  return (
    <Layout>
      <div className="wrap profile">
        {error && (
          <div className="notice notice-error" role="alert" onClick={() => setError('')}>
            {error}
          </div>
        )}

        {hidden ? (
          <EmptyState title="This profile is private" message="Only its owner can see it." />
        ) : !profile ? (
          <LoadingSkeleton count={3} />
        ) : (
          <>
            <header className="profile-head">
              {own ? (
                <label className="profile-picture" title="Change your picture">
                  <Avatar user={profile} size={140} />
                  <span className="label">Change</span>
                  <input type="file" accept="image/*" onChange={changePicture} hidden />
                </label>
              ) : (
                <div className="profile-picture">
                  <Avatar user={profile} size={140} />
                </div>
              )}

              <div className="profile-who">
                <span className="label">
                  Member since {joined}
                  {profile.location && ` · ${profile.location}`}
                </span>
                <h1>{profile.username}</h1>
                <p className={profile.bio ? '' : 'profile-quiet'}>
                  {profile.bio || (own ? 'Add a short bio so people know what you are into.' : 'No bio yet.')}
                </p>
                {profile.interests.length > 0 && (
                  <div className="profile-interests">
                    {profile.interests.map((tag) => (
                      <InterestTag key={tag.id} interest={tag} />
                    ))}
                  </div>
                )}
                {links.length > 0 && (
                  <div className="profile-links">
                    {links.map(([key, label]) => (
                      <a key={key} href={profile[key]} target="_blank" rel="noreferrer" className="link">
                        {label}
                      </a>
                    ))}
                  </div>
                )}
                <div className="profile-actions">
                  {own ? (
                    <>
                      <button type="button" className="button button-primary" onClick={openEditor}>
                        Edit profile
                      </button>
                      <span className="label">{profile.is_profile_public === 0 ? 'Private profile' : 'Public profile'}</span>
                    </>
                  ) : (
                    <>
                      {friendship && (
                        <button
                          type="button"
                          className="button button-primary"
                          disabled={['request_sent', 'friend'].includes(friendship)}
                          onClick={befriend}
                        >
                          {FRIEND_BUTTON[friendship]}
                        </button>
                      )}
                      {friendship === 'friend' && (
                        <Link to="/friends" className="button">
                          Message
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>

              <dl className="profile-stats">
                <div>
                  <dt className="label">Points</dt>
                  <dd>{profile.points || 0}</dd>
                </div>
                <div>
                  <dt className="label">Posts</dt>
                  <dd>{posts?.length ?? '–'}</dd>
                </div>
                <div>
                  <dt className="label">Rooms</dt>
                  <dd>{rooms.length}</dd>
                </div>
              </dl>
            </header>

            <nav className="profile-tabs" aria-label="Profile sections">
              {['posts', 'rooms'].map((name) => (
                <button key={name} type="button" aria-pressed={tab === name} onClick={() => setTab(name)}>
                  {name === 'posts' ? 'Posts' : 'Rooms'}
                </button>
              ))}
            </nav>

            {tab === 'posts' &&
              (!posts ? (
                <LoadingSkeleton count={2} />
              ) : posts.length ? (
                <div className="profile-posts">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLike={toggleLike}
                      onChange={(next) => setPosts((prev) => prev.map((item) => (item.id === next.id ? next : item)))}
                      onDelete={(id) => setPosts((prev) => prev.filter((item) => item.id !== id))}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No posts yet"
                  message={own ? 'Share a question or a project from the feed.' : `${profile.username} has not posted yet.`}
                  action={
                    own && (
                      <Link to="/dashboard" className="link">
                        Go to the feed
                      </Link>
                    )
                  }
                />
              ))}

            {tab === 'rooms' &&
              (rooms.length ? (
                <ul className="profile-rooms">
                  {rooms.map((room) => (
                    <li key={room.id}>
                      <Link to={`/rooms?room=${room.id}`}>
                        <b>{room.name}</b>
                        <span className="label">
                          {room.member_count} {room.member_count === 1 ? 'member' : 'members'}
                          {room.created_by === id && ' · started it'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No rooms yet"
                  message={own ? 'Join or open a room to work with others.' : `${profile.username} is not in any rooms.`}
                />
              ))}
          </>
        )}
      </div>

      <Dialog open={Boolean(form)} title="Edit profile" onClose={() => setForm(null)}>
        {form && (
          <form className="form" onSubmit={save}>
            <label className="field">
              <span className="label">Bio</span>
              <textarea className="field-input" rows={3} maxLength={300} {...field('bio')} autoFocus />
            </label>
            <TagPicker
              tags={allTags}
              selected={form.interests}
              onChange={(interests) => setForm((f) => ({ ...f, interests }))}
              max={8}
              onCreate={createTag}
            />
            <label className="field">
              <span className="label">Location</span>
              <input className="field-input" maxLength={100} {...field('location')} />
            </label>
            {LINKS.map(([key, label]) => (
              <label key={key} className="field">
                <span className="label">{label}</span>
                <input className="field-input" type="url" placeholder="https://" {...field(key)} />
              </label>
            ))}
            <label className="profile-public">
              <input
                type="checkbox"
                className="check"
                checked={form.is_profile_public}
                onChange={(e) => setForm({ ...form, is_profile_public: e.target.checked })}
              />
              Anyone signed in can see my profile
            </label>
            <button type="submit" className="button button-primary">
              Save profile
            </button>
          </form>
        )}
      </Dialog>
    </Layout>
  );
};

// A fresh page for each person, so nothing from the previous profile shows while the next loads.
const Profile = () => {
  const { userId } = useParams();
  return <ProfilePage key={userId || 'me'} />;
};

export default Profile;
