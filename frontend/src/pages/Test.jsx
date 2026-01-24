import api from '../services/api';

export default function Test() {
  const testPrivate = async () => {
    const res = await api.get('/test/private');
    console.log(res.data);
  };

  const testPro = async () => {
    const res = await api.get('/test/pro-only');
    console.log(res.data);
  };

  return (
    <div>
      <button onClick={testPrivate}>Test Privat</button>
      <button onClick={testPro}>Test PRO</button>
    </div>
  );
}
