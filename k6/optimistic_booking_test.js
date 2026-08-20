import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
    scenarios: {
        race_condition_spike: {
            executor: 'per-vu-iterations',
            vus: 100,
            iterations: 1,
            maxDuration: '30s',
        },
    },
};

const BASE_URL = 'http://localhost:8080/api/v1/bookings/optimistic';

export default function () {
    const payload = JSON.stringify({
        concertId: 1,
        userId: 1,
        seatCount: 1,
        idempotencyKey: `optimistic-${__VU}-${randomString(8)}`
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(BASE_URL, payload, params);

    check(res, {
        'status is 200 (Success)': (r) => r.status === 200,
        'status is 400 (Capacity Error)': (r) => r.status === 400,
    });

    sleep(0.1);
}