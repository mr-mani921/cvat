// SPDX-License-Identifier: MIT

import './styles.scss';

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from 'antd/lib/button';
import Alert from 'antd/lib/alert';
import Select from 'antd/lib/select';
import Empty from 'antd/lib/empty';
import Result from 'antd/lib/result';
import { Row, Col } from 'antd/lib/grid';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, ChartData, ChartOptions,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';

import {
    getCore, Job, JobType, ServerError,
} from 'cvat-core-wrapper';
import CVATLoadingSpinner from 'components/common/loading-spinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const core = getCore();
type CountsResponse = Awaited<ReturnType<typeof core.analytics.annotationCounts>>;
type RequestState = { taskID: number; jobID?: number } & (
    { status: 'loading' } |
    { status: 'success'; data: CountsResponse } |
    { status: 'error'; code: number }
);
type JobsState = { taskID: number } & (
    { status: 'loading' } |
    { status: 'success'; jobs: Job[] } |
    { status: 'error'; code: number }
);

const chartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
        x: {
            beginAtZero: true,
            grace: '15%',
            ticks: { precision: 0 },
            title: { display: true, text: 'Saved annotations' },
        },
        y: { ticks: { autoSkip: false } },
    },
    plugins: {
        legend: { display: false },
        datalabels: { anchor: 'end', align: 'end', color: '#303030' },
    },
};

function errorDescription(code: number): string {
    if (code === 401) return 'Your session has expired. Please sign in again.';
    if (code === 403) return 'You do not have access to this task.';
    if (code === 404) return 'This task could not be found.';
    return 'The request failed. Please try again.';
}

function AnnotationAnalyticsPage(): JSX.Element {
    const { tid } = useParams<{ tid: string }>();
    const taskID = Number(tid);
    const validTaskID = /^[1-9]\d*$/.test(tid) && Number.isSafeInteger(taskID);
    const [attempt, setAttempt] = useState(0);
    const [selection, setSelection] = useState<{ taskID: number; jobID?: number }>({ taskID });
    const jobID = selection.taskID === taskID ? selection.jobID : undefined;
    const [jobsAttempt, setJobsAttempt] = useState(0);
    const [jobsState, setJobsState] = useState<JobsState>({ taskID, status: 'loading' });
    const [state, setState] = useState<RequestState>({ taskID, status: 'loading' });

    useEffect(() => setSelection({ taskID }), [taskID]);

    useEffect(() => {
        if (!validTaskID) return undefined;
        let active = true;
        setJobsState({ taskID, status: 'loading' });
        core.jobs.get({ taskID, type: JobType.ANNOTATION }, true).then((jobs) => {
            if (active) {
                setJobsState({
                    taskID,
                    status: 'success',
                    jobs: jobs.filter((job) => job.taskId === taskID &&
                        job.type === JobType.ANNOTATION && job.parentJobId === null).sort((a, b) => a.id - b.id),
                });
            }
        }).catch((error: unknown) => {
            if (active) setJobsState({ taskID, status: 'error', code: error instanceof ServerError ? error.code : 0 });
        });
        return () => { active = false; };
    }, [taskID, validTaskID, jobsAttempt]);

    useEffect(() => {
        if (!validTaskID) return undefined;

        const controller = new AbortController();
        let active = true;
        setState({ taskID, jobID, status: 'loading' });

        core.analytics.annotationCounts(taskID, jobID, controller.signal).then((data) => {
            if (data.task_id !== taskID) throw new Error('Unexpected task response');
            if (active) {
                setState({
                    taskID, jobID, status: 'success', data,
                });
            }
        }).catch((error: unknown) => {
            if (active) {
                setState({
                    taskID, jobID, status: 'error', code: error instanceof ServerError ? error.code : 0,
                });
            }
        });

        return () => {
            active = false;
            controller.abort();
        };
    }, [taskID, jobID, validTaskID, attempt]);

    // Hide old results immediately, before the new task/job effect runs.
    const current: RequestState = state.taskID === taskID && state.jobID === jobID ?
        state : { taskID, jobID, status: 'loading' };
    const currentJobs: JobsState = jobsState.taskID === taskID ? jobsState : { taskID, status: 'loading' };
    const showJobFilter = validTaskID && !(current.status === 'error' && [401, 403].includes(current.code));
    const counts = useMemo(() => (current.status === 'success' ? [...current.data.counts].sort(
        (left, right) => right.count - left.count || left.label_name.localeCompare(right.label_name),
    ) : []), [current]);
    const chartData: ChartData<'bar', number[], string[]> = {
        labels: counts.map((row) => row.label_name.match(/.{1,24}/g) || [row.label_name]),
        datasets: [{ label: 'Saved annotations', data: counts.map((row) => row.count), backgroundColor: '#1890ff' }],
    };
    const rowHeight = Math.max(1, ...counts.map((row) => Math.ceil(row.label_name.length / 24))) * 16 + 16;

    let content: JSX.Element;
    if (!validTaskID) {
        content = <Result status='404' title='Invalid task ID' />;
    } else if (current.status === 'loading') {
        content = (
            <div role='status' className='cvat-annotation-analytics-loading'>
                <CVATLoadingSpinner />
                <Text>Loading annotation analytics...</Text>
            </div>
        );
    } else if (current.status === 'error') {
        content = (
            <Result
                status='error'
                title='Could not load annotation analytics'
                subTitle={errorDescription(current.code)}
                extra={(
                    <>
                        <Button type='primary' onClick={() => setAttempt((value) => value + 1)}>Retry</Button>
                        {current.code === 401 && (
                            <a href={`/auth/login?next=${encodeURIComponent(`/tasks/${taskID}/annotation-analytics`)}`}>
                                Sign in
                            </a>
                        )}
                    </>
                )}
            />
        );
    } else {
        content = (
            <>
                <Text strong className='cvat-annotation-analytics-summary'>
                    {`${current.data.total} saved annotation${current.data.total === 1 ? '' : 's'} across `}
                    {`${counts.length} ${counts.length === 1 ? 'class' : 'classes'}`}
                </Text>
                {counts.length === 0 ? (
                    <Empty description={`No annotations are available for this ${jobID === undefined ? 'task' : 'job'}.`} />
                ) : (
                    <div className='cvat-annotation-analytics-chart-scroll'>
                        <div className='cvat-annotation-analytics-chart' style={{ height: counts.length * rowHeight + 60 }}>
                            <Bar
                                data={chartData}
                                options={chartOptions}
                                plugins={[ChartDataLabels]}
                                role='img'
                                aria-label={`Saved annotation counts by class for task ${taskID}`}
                                fallbackContent={(
                                    <table>
                                        <caption>Saved annotations per class</caption>
                                        <thead><tr><th scope='col'>Class</th><th scope='col'>Count</th></tr></thead>
                                        <tbody>
                                            {counts.map((row) => (
                                                <tr key={row.label_id}><th scope='row'>{row.label_name}</th><td>{row.count}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            />
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className='cvat-annotation-analytics-page'>
            <Row justify='center'>
                <Col span={22} xl={20} xxl={18}>
                    {validTaskID && <Link to={`/tasks/${taskID}`}>Back to task #{taskID}</Link>}
                    <Title level={3}>Annotation Analytics</Title>
                    {validTaskID && <Text>Task #{taskID} - saved shapes per class</Text>}
                    {showJobFilter && (
                        <div className='cvat-annotation-analytics-job-filter'>
                            <Text>Job</Text>
                            <Select
                                id='cvat-annotation-analytics-job'
                                aria-label='Annotation job'
                                value={jobID ?? 0}
                                loading={currentJobs.status === 'loading'}
                                disabled={currentJobs.status !== 'success'}
                                showSearch
                                optionFilterProp='label'
                                onChange={(value: number) => setSelection({ taskID, jobID: value || undefined })}
                                options={[
                                    { value: 0, label: 'All jobs' },
                                    ...(currentJobs.status === 'success' ? currentJobs.jobs.map((job) => ({
                                        value: job.id,
                                        label: `Job #${job.id} (frames ${job.startFrame}-${job.stopFrame})`,
                                    })) : []),
                                ]}
                            />
                            {currentJobs.status === 'error' && (
                                <Alert
                                    type='error'
                                    message='Could not load job choices.'
                                    description={errorDescription(currentJobs.code)}
                                    action={(
                                        <Button onClick={() => setJobsAttempt((value) => value + 1)}>Retry jobs</Button>
                                    )}
                                />
                            )}
                        </div>
                    )}
                    <div className='cvat-annotation-analytics-content' aria-busy={current.status === 'loading'}>
                        {content}
                    </div>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(AnnotationAnalyticsPage);
