// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

context('Task annotation analytics', () => {
    const taskIds = [];

    function countsFor(taskId) {
        const counts = Array.from({ length: 26 }, (_, index) => ({
            label_id: index + 1,
            label_name: index === 0 ? 'A long class name that must remain readable in the chart' : `Class ${index}`,
            count: index,
        }));
        return { task_id: taskId, total: 325, counts };
    }

    function countsRoute(taskId) {
        return { method: 'GET', pathname: `/api/test/tasks/${taskId}/annotation-counts` };
    }

    function visitAnalytics(taskId) {
        cy.visit(`/tasks/${taskId}/annotation-analytics`);
    }

    function navigateToTask(taskId) {
        cy.window().then((win) => {
            win.history.pushState({}, '', `/tasks/${taskId}/annotation-analytics`);
            win.dispatchEvent(new win.PopStateEvent('popstate'));
        });
    }

    function jobsFor(taskId) {
        const first = taskId * 100;
        const job = (offset, fields = {}) => ({
            id: first + offset,
            task_id: taskId,
            type: 'annotation',
            parent_job_id: null,
            start_frame: offset * 4,
            stop_frame: offset * 4 + 3,
            ...fields,
        });
        return [job(1), job(2), job(3), job(4, { type: 'ground_truth' }),
            job(5, { parent_job_id: first + 1 }), job(6, { type: 'replica' }),
            job(7, { task_id: taskId + 100 })];
    }

    function selectJob(label) {
        cy.get('.cvat-annotation-analytics-job-filter .ant-select').should('not.have.class', 'ant-select-disabled')
            .click();
        cy.contains('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option', label).click();
    }

    function filteredCounts(taskId, jobId) {
        const [first, second] = jobsFor(taskId);
        const counts = [
            { label_id: 1, label_name: 'First job class', count: 1 },
            { label_id: 2, label_name: 'Second job class', count: 2 },
        ].filter((row) => !jobId || (jobId === first.id && row.label_id === 1) ||
            (jobId === second.id && row.label_id === 2));
        return { task_id: taskId, total: counts.reduce((total, row) => total + row.count, 0), counts };
    }

    beforeEach(() => {
        cy.intercept({ method: 'GET', pathname: '/api/jobs' }, (request) => {
            const taskId = Number(request.query.task_id);
            if (!taskIds.includes(taskId)) {
                request.continue();
                return;
            }
            const jobs = jobsFor(taskId);
            request.reply({
                count: jobs.length, results: jobs, next: null, previous: null,
            });
        }).as('jobs');
    });

    before(() => {
        cy.visit('/auth/login');
        cy.headlessLogin({ nextURL: '/tasks' });
        cy.getCookie('csrftoken').then((cookie) => {
            for (let index = 0; index < 2; index++) {
                cy.request({
                    method: 'POST',
                    url: '/api/tasks',
                    headers: { 'X-CSRFTOKEN': cookie.value },
                    body: {
                        name: `Annotation analytics UI test ${Date.now()}-${index}`,
                        labels: [{ name: 'fixture class', type: 'rectangle' }],
                    },
                }).then((response) => taskIds.push(response.body.id));
            }
        });
    });

    after(() => {
        taskIds.forEach((taskId) => cy.headlessDeleteTask(taskId));
    });

    it('Opens from task actions and requests the selected task ID', () => {
        const taskId = taskIds[0];
        cy.intercept(countsRoute(taskId), { body: countsFor(taskId) }).as('counts');
        cy.intercept({ method: 'GET', pathname: '/api/tasks' }).as('taskList');
        cy.visit('/tasks');
        cy.wait('@taskList', { responseTimeout: 60000 });
        cy.contains('.cvat-tasks-list-item', `#${taskId}:`, { timeout: 30000 }).within(() => {
            cy.get('.cvat-task-item-actions-button').click();
        });
        cy.contains('.ant-dropdown-menu-item', 'Annotation analytics').click();
        cy.url().should('include', `/tasks/${taskId}/annotation-analytics`);
        cy.wait('@counts').its('request.url').should('include', `/test/tasks/${taskId}/annotation-counts`);
        cy.contains('325 saved annotations across 26 classes').should('be.visible');
    });

    it('Draws every class and exact count, including zero and a long label', () => {
        const taskId = taskIds[0];
        cy.intercept(countsRoute(taskId), { body: countsFor(taskId) }).as('counts');
        cy.visit(`/tasks/${taskId}/annotation-analytics`, {
            onBeforeLoad(win) {
                cy.spy(win.CanvasRenderingContext2D.prototype, 'fillText').as('chartText');
            },
        });
        cy.wait('@counts');
        cy.get('.cvat-annotation-analytics-chart canvas').should('be.visible');
        cy.get('canvas tbody tr').should('have.length', 26).then(($rows) => {
            const entries = [...$rows].map((row) => ({
                label: row.querySelector('th').textContent,
                count: Number(row.querySelector('td').textContent),
            }));
            countsFor(taskId).counts.forEach((row) => {
                expect(entries).to.deep.include({ label: row.label_name, count: row.count });
            });
            expect(entries[0]).to.deep.equal({ label: 'Class 25', count: 25 });
            expect(entries[25].count).to.equal(0);
        });
        cy.get('@chartText').should('have.been.calledWith', 'Class 25');
        cy.get('@chartText').should('have.been.calledWith', '25');
        cy.get('@chartText').should('have.been.calledWith', '0');
    });

    it('Shows a valid empty response without a graph or error', () => {
        const taskId = taskIds[0];
        cy.intercept(countsRoute(taskId), { body: { task_id: taskId, total: 0, counts: [] } }).as('counts');
        visitAnalytics(taskId);
        cy.wait('@counts');
        cy.contains('No annotations are available for this task.').should('be.visible');
        cy.contains('0 saved annotations across 0 classes').should('be.visible');
        cy.get('.cvat-annotation-analytics-chart').should('not.exist');
        cy.get('.ant-result-error').should('not.exist');
    });

    it('Fits a narrow viewport while preserving every class', () => {
        const taskId = taskIds[0];
        cy.viewport(480, 900);
        cy.intercept(countsRoute(taskId), { body: countsFor(taskId) }).as('counts');
        visitAnalytics(taskId);
        cy.wait('@counts');
        cy.get('.cvat-annotation-analytics-chart canvas').should('be.visible');
        cy.get('canvas tbody tr').should('have.length', 26);
        cy.get('.cvat-annotation-analytics-page').should(($page) => {
            expect($page[0].scrollWidth).to.be.at.most($page[0].clientWidth + 1);
        });
        cy.viewport(1300, 960);
    });

    it('Hides internal failure details and retries with a fresh request', () => {
        const taskId = taskIds[0];
        let requests = 0;
        cy.intercept(countsRoute(taskId), (request) => {
            requests++;
            request.reply(requests === 1 ?
                { statusCode: 503, body: { detail: 'PRIVATE_TRACE_SECRET' } } :
                { statusCode: 200, body: countsFor(taskId) });
        }).as('counts');
        visitAnalytics(taskId);
        cy.wait('@counts');
        cy.contains('Could not load annotation analytics').should('be.visible');
        cy.contains('PRIVATE_TRACE_SECRET').should('not.exist');
        cy.get('.cvat-annotation-analytics-chart').should('not.exist');
        cy.contains('button', 'Retry').click();
        cy.wait('@counts');
        cy.contains('325 saved annotations across 26 classes').should('be.visible');
        cy.then(() => expect(requests).to.equal(2));
    });

    it('Handles a network failure without crashing', () => {
        const taskId = taskIds[0];
        cy.intercept(countsRoute(taskId), { forceNetworkError: true }).as('counts');
        visitAnalytics(taskId);
        cy.contains('Could not load annotation analytics').should('be.visible');
        cy.contains('button', 'Retry').should('be.visible');
        cy.get('.cvat-annotation-analytics-chart').should('not.exist');
    });

    it('Shows loading before success without flashing the empty state', () => {
        const taskId = taskIds[0];
        cy.intercept(countsRoute(taskId), { delay: 1000, body: countsFor(taskId) }).as('counts');
        visitAnalytics(taskId);
        cy.contains('Loading annotation analytics...').should('be.visible');
        cy.get('.ant-empty').should('not.exist');
        cy.wait('@counts');
        cy.contains('Loading annotation analytics...').should('not.exist');
        cy.get('.cvat-annotation-analytics-chart canvas').should('be.visible');
    });

    it('Does not let a delayed old task overwrite the newly selected task', () => {
        const [oldId, newId] = taskIds;
        let releaseOldResponse;
        cy.intercept(countsRoute(oldId), (request) => new Cypress.Promise((resolve) => {
            releaseOldResponse = () => {
                request.reply({
                    body: {
                        task_id: oldId,
                        total: 111,
                        counts: [
                            { label_id: 1, label_name: 'Old class', count: 111 },
                        ],
                    },
                });
                resolve();
            };
        }));
        cy.intercept(countsRoute(newId), { body: countsFor(newId) }).as('newCounts');
        visitAnalytics(oldId);
        cy.contains('Loading annotation analytics...').should('be.visible');
        navigateToTask(newId);
        cy.wait('@newCounts');
        cy.then(() => releaseOldResponse());
        cy.contains(`Task #${newId} - saved shapes per class`).should('be.visible');
        cy.contains('325 saved annotations across 26 classes').should('be.visible');
        cy.contains('Old class').should('not.exist');
    });

    [401, 403].forEach((code) => {
        it(`Removes previous statistics when the next task returns HTTP ${code}`, () => {
            const [firstId, secondId] = taskIds;
            cy.intercept(countsRoute(firstId), { body: countsFor(firstId) }).as('firstCounts');
            cy.intercept(countsRoute(secondId), { statusCode: code, body: { detail: 'PRIVATE_TRACE_SECRET' } })
                .as('deniedCounts');
            visitAnalytics(firstId);
            cy.wait('@firstCounts');
            cy.get('.cvat-annotation-analytics-chart canvas').should('be.visible');
            navigateToTask(secondId);
            cy.wait('@deniedCounts');
            cy.contains(code === 401 ? 'Your session has expired.' : 'You do not have access to this task.', {
                matchCase: false,
            }).should('be.visible');
            cy.get('.cvat-annotation-analytics-chart').should('not.exist');
            cy.get('.cvat-annotation-analytics-summary').should('not.exist');
            cy.contains('PRIVATE_TRACE_SECRET').should('not.exist');
            if (code === 401) cy.contains('a', 'Sign in').should('have.attr', 'href').and('include', '/auth/login?next=');
        });
    });

    it('Filters eligible jobs and returns to the unchanged All jobs request', () => {
        const taskId = taskIds[0];
        const [first, second] = jobsFor(taskId);
        cy.intercept(countsRoute(taskId), (request) => {
            request.reply(filteredCounts(taskId, Number(request.query.job_id) || undefined));
        }).as('filtered');
        visitAnalytics(taskId);
        cy.wait('@filtered').its('request.query').should('not.have.property', 'job_id');
        cy.contains('3 saved annotations across 2 classes').should('be.visible');
        cy.wait('@jobs').its('request.query').should('include', { task_id: String(taskId), type: 'annotation' });
        cy.get('.cvat-annotation-analytics-job-filter .ant-select').click();
        cy.get('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').should('have.length', 4);
        cy.contains('.ant-select-item-option', `Job #${first.id} `).click();
        cy.wait('@filtered').its('request.query.job_id').should('equal', String(first.id));
        cy.contains('1 saved annotation across 1 class').should('be.visible');
        cy.get('canvas tbody tr').should('have.length', 1).and('contain', 'First job class');
        selectJob(`Job #${second.id} `);
        cy.wait('@filtered').its('request.query.job_id').should('equal', String(second.id));
        cy.get('canvas tbody tr').should('have.length', 1).and('contain', 'Second job class');
        selectJob('All jobs');
        cy.wait('@filtered').its('request.query').should('not.have.property', 'job_id');
        cy.contains('3 saved annotations across 2 classes').should('be.visible');
    });

    it('Shows an empty selected job without a graph', () => {
        const taskId = taskIds[0];
        const emptyJob = jobsFor(taskId)[2];
        cy.intercept(countsRoute(taskId), (request) => {
            request.reply(filteredCounts(taskId, Number(request.query.job_id) || undefined));
        }).as('filtered');
        visitAnalytics(taskId);
        cy.wait('@filtered');
        selectJob(`Job #${emptyJob.id} `);
        cy.wait('@filtered');
        cy.contains('No annotations are available for this job.').should('be.visible');
        cy.get('.cvat-annotation-analytics-chart').should('not.exist');
    });

    it('Retries the selected job after a failure without showing the prior graph', () => {
        const taskId = taskIds[0];
        const job = jobsFor(taskId)[0];
        let attempts = 0;
        cy.intercept(countsRoute(taskId), (request) => {
            if (request.query.job_id) {
                expect(request.query.job_id).to.equal(String(job.id));
                attempts++;
                request.reply(attempts === 1 ? { statusCode: 503, body: { detail: 'PRIVATE_TRACE_SECRET' } } :
                    { body: filteredCounts(taskId, job.id) });
            } else request.reply(filteredCounts(taskId));
        }).as('filtered');
        visitAnalytics(taskId);
        cy.wait('@filtered');
        selectJob(`Job #${job.id} `);
        cy.wait('@filtered');
        cy.contains('Could not load annotation analytics').should('be.visible');
        cy.get('.cvat-annotation-analytics-chart').should('not.exist');
        cy.contains('PRIVATE_TRACE_SECRET').should('not.exist');
        cy.contains('button', 'Retry').click();
        cy.wait('@filtered');
        cy.get('canvas tbody tr').should('contain', 'First job class');
        cy.then(() => expect(attempts).to.equal(2));
    });

    [401, 403].forEach((code) => {
        it(`Clears previous job statistics and choices after HTTP ${code}`, () => {
            const taskId = taskIds[0];
            const job = jobsFor(taskId)[0];
            cy.intercept(countsRoute(taskId), (request) => {
                request.reply(request.query.job_id ? { statusCode: code, body: { detail: 'PRIVATE_TRACE_SECRET' } } :
                    { body: filteredCounts(taskId) });
            }).as('filtered');
            visitAnalytics(taskId);
            cy.wait('@filtered');
            selectJob(`Job #${job.id} `);
            cy.wait('@filtered');
            cy.contains(code === 401 ? 'Your session has expired.' : 'You do not have access to this task.').should('be.visible');
            cy.get('.cvat-annotation-analytics-chart').should('not.exist');
            cy.get('.cvat-annotation-analytics-summary').should('not.exist');
            cy.get('.cvat-annotation-analytics-job-filter').should('not.exist');
            cy.contains('PRIVATE_TRACE_SECRET').should('not.exist');
        });
    });

    it('Does not let a delayed job response overwrite the newly selected job', () => {
        const taskId = taskIds[0];
        const [first, second] = jobsFor(taskId);
        let releaseFirst;
        cy.intercept(countsRoute(taskId), (request) => {
            if (Number(request.query.job_id) === first.id) {
                return new Cypress.Promise((resolve) => {
                    releaseFirst = () => { request.reply(filteredCounts(taskId, first.id)); resolve(); };
                });
            }
            request.reply(filteredCounts(taskId, Number(request.query.job_id) || undefined));
            return undefined;
        }).as('filtered');
        visitAnalytics(taskId);
        cy.wait('@filtered');
        selectJob(`Job #${first.id} `);
        cy.contains('Loading annotation analytics...').should('be.visible');
        cy.get('.cvat-annotation-analytics-summary').should('not.exist');
        selectJob(`Job #${second.id} `);
        cy.contains('2 saved annotations across 1 class').should('be.visible');
        cy.then(() => releaseFirst());
        cy.get('canvas tbody tr').should('have.length', 1).and('contain', 'Second job class');
    });

    it('Retries job-list failure while keeping the valid task-wide response', () => {
        const taskId = taskIds[0];
        let attempts = 0;
        cy.intercept({ method: 'GET', pathname: '/api/jobs' }, (request) => {
            attempts++;
            const jobs = jobsFor(taskId);
            request.reply(attempts === 1 ? { statusCode: 503, body: { detail: 'PRIVATE_TRACE_SECRET' } } :
                {
                    body: {
                        count: jobs.length, results: jobs, next: null, previous: null,
                    },
                });
        }).as('retryJobs');
        cy.intercept(countsRoute(taskId), { body: filteredCounts(taskId) }).as('counts');
        visitAnalytics(taskId);
        cy.wait('@counts');
        cy.wait('@retryJobs');
        cy.contains('3 saved annotations across 2 classes').should('be.visible');
        cy.contains('Could not load job choices.').should('be.visible');
        cy.contains('PRIVATE_TRACE_SECRET').should('not.exist');
        cy.contains('button', 'Retry jobs').click();
        cy.wait('@retryJobs');
        cy.contains('Could not load job choices.').should('not.exist');
        selectJob(`Job #${jobsFor(taskId)[0].id} `);
    });

    it('Resets the job selection when navigating to a different task', () => {
        const [firstTask, secondTask] = taskIds;
        cy.intercept(countsRoute(firstTask), (request) => {
            request.reply(filteredCounts(firstTask, Number(request.query.job_id) || undefined));
        }).as('first');
        cy.intercept(countsRoute(secondTask), { body: countsFor(secondTask) }).as('second');
        visitAnalytics(firstTask);
        cy.wait('@first');
        selectJob(`Job #${jobsFor(firstTask)[0].id} `);
        cy.wait('@first');
        navigateToTask(secondTask);
        cy.wait('@second').its('request.query').should('not.have.property', 'job_id');
        cy.contains('325 saved annotations across 26 classes').should('be.visible');
        cy.get('.cvat-annotation-analytics-job-filter .ant-select-selection-item').should('have.text', 'All jobs');
    });
});
