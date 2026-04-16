import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { responseAPI, surveyAPI } from '../utils/api';
import { useSocket } from '../context/SocketContext';

export default function SurveyResponses() {
  const { id } = useParams();
  const [responses, setResponses] = useState([]);
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selected, setSelected] = useState(null);
  const { on, joinSurveyRoom } = useSocket();

  const load = useCallback(async () => {
    try {
      const [rData, sData] = await Promise.all([
        responseAPI.getBySurvey(id, { page, limit: 15 }),
        surveyAPI.getById(id),
      ]);
      setResponses(rData.data.responses);
      setPagination(rData.data.pagination);
      setSurvey(sData.data.survey);
    } catch {
      toast.error('Failed to load responses');
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => { load(); joinSurveyRoom(id); }, [load, id, joinSurveyRoom]);

  useEffect(() => {
    const cleanup = on('new-response', (data) => {
      if (data.surveyId === id) {
        setResponses(prev => [data.response, ...prev]);
        toast.success('New response received!', { autoClose: 1500 });
      }
    });
    return cleanup;
  }, [on, id]);

  const handleDelete = async (rid) => {
    if (!window.confirm('Delete this response?')) return;
    try {
      await responseAPI.delete(rid);
      setResponses(responses.filter(r => r._id !== rid));
      toast.success('Response deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleExport = () => {
    window.open(responseAPI.exportCSV(id), '_blank');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Responses</h1>
          <p className="page-subtitle">{survey?.title} · {pagination.total || 0} total responses</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to={`/surveys/${id}/analytics`} className="btn btn-secondary">◎ Analytics</Link>
          <button className="btn btn-primary" onClick={handleExport}>⬇ Export CSV</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
        {/* Table */}
        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : responses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">◎</div>
              <h3 className="empty-state-title">No responses yet</h3>
              <p className="empty-state-desc">Responses will appear here in real-time once submitted.</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Respondent</th>
                      <th>Submitted At</th>
                      <th>Time Taken</th>
                      <th>Answers</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r, i) => (
                      <tr key={r._id} style={{ cursor: 'pointer' }} onClick={() => setSelected(r)}>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {(page - 1) * 15 + i + 1}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: 6, background: 'var(--gradient-primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, flexShrink: 0,
                            }}>
                              {(r.respondentName || 'A')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>{r.respondentName || 'Anonymous'}</div>
                              {r.respondentEmail && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.respondentEmail}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {new Date(r.submittedAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {r.timeTaken ? `${r.timeTaken}s` : '—'}
                        </td>
                        <td>
                          <span className="badge badge-blue">{r.answers?.length || 0} answered</span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r._id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {page} / {pagination.pages}
                  </span>
                  <button className="btn btn-secondary btn-sm" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Response detail panel */}
        {selected && (
          <div className="card" style={{ position: 'sticky', top: 80, maxHeight: 'calc(100vh - 120px)', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Response Detail</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>✕ Close</button>
            </div>

            <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{selected.respondentName || 'Anonymous'}</div>
              {selected.respondentEmail && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.respondentEmail}</div>}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                {new Date(selected.submittedAt).toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {survey?.questions?.map((q, qi) => {
                const answer = selected.answers?.find(a => a.questionId === q.id);
                return (
                  <div key={qi} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
                      Q{qi + 1}: {q.question}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {answer ? (
                        Array.isArray(answer.value)
                          ? answer.value.join(', ')
                          : String(answer.value)
                      ) : <em style={{ color: 'var(--text-muted)' }}>No answer</em>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
