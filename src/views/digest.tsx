import type { DigestRow, Night } from '../digest/types.js';

const dash = '—';

function Row({ r }: { r: DigestRow }) {
  const warn = r.retries >= 3 || r.lastStatus === 'fail';
  return (
    <tr class={warn ? 'warn' : undefined}>
      <td>{r.job}</td>
      <td>{r.owner ?? dash}</td>
      <td>{r.runs}</td>
      <td>{r.retries}</td>
      <td>{r.lastStatus}</td>
      <td>{r.lastError ?? dash}</td>
      <td>{r.firstAt}</td>
      <td>{r.lastAt}</td>
    </tr>
  );
}

export function DigestPage({ night }: { night: Night }) {
  const bad = night.badLines;
  return (
    <>
      <h1>digest {night.night}</h1>
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((r) => (
              <Row r={r} />
            ))}
          </tbody>
        </table>
      )}
      {bad > 0 && (
        <p class="mute">
          {bad} {bad === 1 ? 'line' : 'lines'} could not be read
        </p>
      )}
    </>
  );
}

export function DigestMissing({ night }: { night: string }) {
  return (
    <>
      <h1>digest {night}</h1>
      <p class="warn">no log for this night</p>
    </>
  );
}
