export default function Alert({ error, success }) {
  if (!error && !success) return null;
  return <div className={`alert ${error ? 'error' : 'success'}`}>{error || success}</div>;
}
