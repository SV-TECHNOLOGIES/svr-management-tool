"use client";

import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  UserCheck, 
  Upload, 
  Share2, 
  Loader2, 
  X,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getStudents, 
  getAdmins, 
  updateSubmissionFile, 
  reviewSubmission, 
  updateShareStatus, 
  recordStudentFeedback, 
  updateSubmissionStatus, 
  addSubmissionNote 
} from '@/lib/api';

const renderAdminName = (admin: any) => {
  if (!admin) return 'Not set';
  if (typeof admin === 'string') return admin;
  if (typeof admin === 'object' && admin.name) return admin.name;
  return 'Not set';
};

export default function SubmissionsLifecyclePage() {
  const [students, setStudents] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Default Stage Filter set to 'PENDING' data (Requirement #2: "by default when we open only filter should be pending data")
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');

  // Active submission drawer/modal for detailed action
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [activeAdminId, setActiveAdminId] = useState<string>('');

  // Form states inside submission modal
  const [fileLink, setFileLink] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [studentFeedback, setStudentFeedback] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentData, adminData] = await Promise.all([
        getStudents(),
        getAdmins(),
      ]);
      setStudents(studentData);
      setAdmins(adminData);
      if (adminData.length > 0) {
        setActiveAdminId(adminData[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openSubmissionModal = (submission: any, student: any) => {
    setSelectedSub({ 
      ...submission, 
      submittedByAdmin: renderAdminName(submission.submittedByAdmin),
      reviewedByAdmin: renderAdminName(submission.reviewedByAdmin),
      studentName: student.name, 
      rollNo: student.rollNo, 
      projectTitle: student.projectTitle 
    });
    setFileLink(submission.fileLink || '');
    setStudentFeedback(submission.studentFeedback || '');
    setErrorMsg('');
    setActionSuccess('');
  };

  // 1. Handle Drive Link Upload
  const handleUploadLink = async () => {
    if (!fileLink) {
      setErrorMsg('Please enter a valid Google Drive or Code repository link.');
      return;
    }
    try {
      setProcessing(true);
      setErrorMsg('');
      const updated = await updateSubmissionFile(selectedSub.id, {
        fileLink,
        submittedByAdminId: activeAdminId,
      });
      setSelectedSub((prev: any) => ({ 
        ...prev, 
        ...updated,
        submittedByAdmin: renderAdminName(updated.submittedByAdmin),
        reviewedByAdmin: renderAdminName(updated.reviewedByAdmin),
      }));
      setActionSuccess('File link updated & status changed to SUBMITTED!');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to update file link.');
    } finally {
      setProcessing(false);
    }
  };

  // 2. Handle Peer Review
  const handlePeerReview = async (action: 'APPROVE' | 'REQUEST_CHANGES') => {
    try {
      setProcessing(true);
      setErrorMsg('');
      const updated = await reviewSubmission(selectedSub.id, {
        reviewedByAdminId: activeAdminId,
        action,
        reviewNotes,
      });
      setSelectedSub((prev: any) => ({ 
        ...prev, 
        ...updated,
        submittedByAdmin: renderAdminName(updated.submittedByAdmin),
        reviewedByAdmin: renderAdminName(updated.reviewedByAdmin),
      }));
      setActionSuccess(`Peer review complete: ${action}!`);
      setReviewNotes('');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to complete peer review.');
    } finally {
      setProcessing(false);
    }
  };

  // 3. Handle Share Toggle
  const handleToggleShare = async (shared: boolean) => {
    try {
      setProcessing(true);
      setErrorMsg('');
      const updated = await updateShareStatus(selectedSub.id, { sharedWithStudent: shared });
      setSelectedSub((prev: any) => ({ 
        ...prev, 
        ...updated,
        submittedByAdmin: renderAdminName(updated.submittedByAdmin),
        reviewedByAdmin: renderAdminName(updated.reviewedByAdmin),
      }));
      setActionSuccess(shared ? 'File shared with student!' : 'Share status updated.');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to update share status.');
    } finally {
      setProcessing(false);
    }
  };

  // 4. Handle Record Feedback
  const handleRecordFeedback = async () => {
    if (!studentFeedback) {
      setErrorMsg('Student feedback response text is required.');
      return;
    }
    try {
      setProcessing(true);
      setErrorMsg('');
      const updated = await recordStudentFeedback(selectedSub.id, { studentFeedback });
      setSelectedSub((prev: any) => ({ 
        ...prev, 
        ...updated,
        submittedByAdmin: renderAdminName(updated.submittedByAdmin),
        reviewedByAdmin: renderAdminName(updated.reviewedByAdmin),
      }));
      setActionSuccess('Student feedback recorded!');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to record feedback.');
    } finally {
      setProcessing(false);
    }
  };

  // 5. Complete Stage
  const handleCompleteStage = async () => {
    try {
      setProcessing(true);
      setErrorMsg('');
      const updated = await updateSubmissionStatus(selectedSub.id, { status: 'COMPLETED' });
      setSelectedSub((prev: any) => ({ 
        ...prev, 
        ...updated,
        submittedByAdmin: renderAdminName(updated.submittedByAdmin),
        reviewedByAdmin: renderAdminName(updated.reviewedByAdmin),
      }));
      setActionSuccess('Submission stage marked as COMPLETED!');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to mark COMPLETED.');
    } finally {
      setProcessing(false);
    }
  };

  // 6. Add Note
  const handleAddNote = async () => {
    if (!newNoteContent) return;
    try {
      setProcessing(true);
      const note = await addSubmissionNote(selectedSub.id, {
        adminId: activeAdminId,
        content: newNoteContent,
      });
      setSelectedSub((prev: any) => ({
        ...prev,
        notes: [note, ...(prev.notes || [])],
      }));
      setNewNoteContent('');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to add note.');
    } finally {
      setProcessing(false);
    }
  };

  // Flatten all submissions into table rows
  const allSubmissionsList: any[] = [];
  students.forEach((student) => {
    student.submissions?.forEach((sub: any) => {
      allSubmissionsList.push({
        ...sub,
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        mobileNo: student.mobileNo,
        projectTitle: student.projectTitle,
        mscProjectName: student.mscProjectName,
      });
    });
  });

  // Filter based on stage status (DEFAULT = PENDING action items)
  const filteredSubmissions = allSubmissionsList.filter((sub) => {
    if (statusFilter === 'PENDING') {
      return ['PENDING', 'SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED'].includes(sub.status);
    }
    if (statusFilter === 'SUBMITTED') return sub.status === 'SUBMITTED';
    if (statusFilter === 'IN_REVIEW') return sub.status === 'IN_REVIEW';
    if (statusFilter === 'CHANGES_REQUESTED') return sub.status === 'CHANGES_REQUESTED';
    if (statusFilter === 'SHARED') return ['APPROVED', 'SHARED_WITH_STUDENT', 'FEEDBACK_RECEIVED'].includes(sub.status);
    if (statusFilter === 'COMPLETED') return sub.status === 'COMPLETED';
    return true; // ALL
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Submissions Lifecycle & Peer Review
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Submission workflow: file links, peer review, sharing status, student feedback & notes.
          </p>
        </div>

        {/* Active Admin Switcher */}
        <div className="flex items-center gap-3 bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase px-2">Operating As Admin:</span>
          <select 
            value={activeAdminId}
            onChange={(e) => setActiveAdminId(e.target.value)}
            className="px-3 py-1.5 bg-slate-100 border-none rounded-lg text-xs font-bold text-slate-900 outline-none"
          >
            {admins.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stage Based Filter Pills (Default set to PENDING Data as per Requirement #2) */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button 
            onClick={() => setStatusFilter('PENDING')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pending Action (Default)
          </button>
          <button 
            onClick={() => setStatusFilter('SUBMITTED')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'SUBMITTED' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Submitted
          </button>
          <button 
            onClick={() => setStatusFilter('IN_REVIEW')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'IN_REVIEW' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            In Review
          </button>
          <button 
            onClick={() => setStatusFilter('CHANGES_REQUESTED')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'CHANGES_REQUESTED' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Changes Requested
          </button>
          <button 
            onClick={() => setStatusFilter('SHARED')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'SHARED' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Approved / Shared
          </button>
          <button 
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'COMPLETED' ? 'bg-green-700 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Completed
          </button>
          <button 
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Submissions
          </button>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing {filteredSubmissions.length} of {allSubmissionsList.length} Stage Records
        </div>
      </div>

      {/* Submissions Pipeline Table (Requirement #1: Table first for scaling to 10+ students/projects) */}
      <div className="glass-card overflow-hidden rounded-2xl">
        {loading ? (
          <div className="p-12 flex justify-center items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-slate-500">Loading submission lifecycle board...</span>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No submissions found under the selected stage filter ({statusFilter}).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-200">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Stage Name</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4">File Link</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted By</th>
                  <th className="px-6 py-4">Reviewed By</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{sub.studentName}</h4>
                        <p className="text-xs text-slate-400">{sub.rollNo} • {sub.mscProjectName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800 text-xs">
                        Stage {sub.order}: {sub.stageName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                      {new Date(sub.deadline).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {sub.fileLink ? (
                        <a 
                          href={sub.fileLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-semibold max-w-[160px] truncate"
                        >
                          View Link <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No link</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                        sub.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        sub.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        sub.status === 'SUBMITTED' || sub.status === 'IN_REVIEW' ? 'bg-blue-100 text-blue-700' :
                        sub.status === 'CHANGES_REQUESTED' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                      {renderAdminName(sub.submittedByAdmin)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                      {renderAdminName(sub.reviewedByAdmin)}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => openSubmissionModal(sub, { name: sub.studentName, rollNo: sub.rollNo, projectTitle: sub.projectTitle })}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        Manage <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILED ACTION MODAL (Opened when clicking Manage on a row) */}
      <AnimatePresence>
        {selectedSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 my-8"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-primary uppercase">
                    Stage {selectedSub.order}: {selectedSub.stageName}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedSub.studentName}</h3>
                  <p className="text-xs text-slate-500">{selectedSub.projectTitle}</p>
                </div>
                <button 
                  onClick={() => setSelectedSub(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Current Lifecycle Status:</span>
                <span className="px-3 py-1 bg-primary text-white font-bold text-xs rounded-lg uppercase">
                  {selectedSub.status}
                </span>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle size={16} /> {errorMsg}
                </div>
              )}

              {actionSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <CheckCircle size={16} /> {actionSuccess}
                </div>
              )}

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {/* 1. Drive / Code Link Section */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                    <Upload size={16} className="text-primary" /> Step 1: File / Drive Link Upload
                  </h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={fileLink}
                      onChange={(e) => setFileLink(e.target.value)}
                      placeholder="https://drive.google.com/... or https://github.com/..."
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                    <button 
                      onClick={handleUploadLink}
                      disabled={processing}
                      className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark disabled:opacity-50"
                    >
                      Save & Submit
                    </button>
                  </div>
                </div>

                {/* 2. Peer Review Section */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                    <UserCheck size={16} className="text-primary" /> Step 2: Peer Review (Different Admin Required)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Submitted by Admin: <strong>{renderAdminName(selectedSub.submittedByAdmin)}</strong>
                  </p>
                  <textarea 
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Peer review comments or change request notes..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none h-16"
                  />
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handlePeerReview('APPROVE')}
                      disabled={processing || selectedSub.status === 'PENDING'}
                      className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <CheckCircle size={14} /> Approve Review
                    </button>
                    <button 
                      onClick={() => handlePeerReview('REQUEST_CHANGES')}
                      disabled={processing || selectedSub.status === 'PENDING'}
                      className="flex-1 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <XCircle size={14} /> Request Changes
                    </button>
                  </div>
                </div>

                {/* 3. Share with Student Section */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                    <Share2 size={16} className="text-primary" /> Step 3: Shared with Student Status
                  </h4>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-xs font-semibold text-slate-700">
                      Has this submission file/feedback been shared with the student?
                    </span>
                    <button 
                      onClick={() => handleToggleShare(!selectedSub.sharedWithStudent)}
                      disabled={processing}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold ${
                        selectedSub.sharedWithStudent 
                          ? 'bg-green-100 text-green-700 border border-green-300' 
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {selectedSub.sharedWithStudent ? 'SHARED WITH STUDENT' : 'NOT SHARED'}
                    </button>
                  </div>
                </div>

                {/* 4. Student Feedback Recording Section */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                    <MessageSquare size={16} className="text-primary" /> Step 4: Record Student Feedback Response
                  </h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={studentFeedback}
                      onChange={(e) => setStudentFeedback(e.target.value)}
                      placeholder="Enter student feedback response..."
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                    <button 
                      onClick={handleRecordFeedback}
                      disabled={processing}
                      className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark disabled:opacity-50"
                    >
                      Record Feedback
                    </button>
                  </div>
                </div>

                {/* 5. Complete Stage Button */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 uppercase">Close & Complete Stage</h4>
                    <p className="text-[11px] text-emerald-700">Fully closes out this submission stage.</p>
                  </div>
                  <button 
                    onClick={handleCompleteStage}
                    disabled={processing || selectedSub.status === 'COMPLETED'}
                    className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {selectedSub.status === 'COMPLETED' ? 'STAGE CLOSED' : 'MARK STAGE COMPLETED'}
                  </button>
                </div>

                {/* 6. Free-form Notes Section */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                    <FileText size={16} className="text-primary" /> Submission Timestamped Notes (#10)
                  </h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Add internal project note..."
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                    <button 
                      onClick={handleAddNote}
                      disabled={processing}
                      className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 disabled:opacity-50"
                    >
                      Add Note
                    </button>
                  </div>

                  <div className="space-y-2 pt-2">
                    {selectedSub.notes?.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No notes recorded yet.</p>
                    ) : (
                      selectedSub.notes?.map((n: any) => (
                        <div key={n.id} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                            <span>{renderAdminName(n.admin)}</span>
                            <span>{new Date(n.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-800 font-medium">{n.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
