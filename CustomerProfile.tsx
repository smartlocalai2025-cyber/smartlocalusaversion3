import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const CustomerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const query = useQuery();
  const navigate = useNavigate();
  const [code, setCode] = useState(query.get('code') || '');
  const [inputCode, setInputCode] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id || !code) return;
    setLoading(true);
    fetch(`/api/customer/profile/${id}`)
      .then(res => res.json())
      .then(data => {
        if (!data.profile) throw new Error('Profile not found');
        if (data.profile.verificationCode !== code) {
          setError('Verification code is incorrect.');
        } else {
          setProfile(data.profile);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, code]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCode(inputCode);
    navigate(`/customer/${id}?code=${inputCode}`);
  };

  if (loading) return <div>Loading...</div>;
  if (error && !profile) {
    return (
      <div>
        <h2>Profile Verification</h2>
        <p>{error}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter verification code"
            value={inputCode}
            onChange={e => setInputCode(e.target.value)}
          />
          <button type="submit">Verify</button>
        </form>
      </div>
    );
  }
  if (!profile) return null;
  return (
    <div>
      <h2>Welcome, {profile.contact.email || profile.contact.phone}</h2>
      <h3>Your Tools</h3>
      <ul>
        {profile.selectedTools.map((tool: string) => (
          <li key={tool}>{tool}</li>
        ))}
      </ul>
      <h3>Progress</h3>
      <ul>
        {Object.entries(profile.progress || {}).map(([tool, prog]: any) => (
          <li key={tool}>{tool}: {prog.status} (Last updated: {prog.lastUpdated})</li>
        ))}
      </ul>
    </div>
  );
};

export default CustomerProfile;
