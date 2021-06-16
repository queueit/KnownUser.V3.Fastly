import {QueueParameterHelper, Utils} from "../sdk/QueueITHelpers";

describe('utils', ()=>{
    it('should be able to encode WR IDs', ()=>{
        const encodedURL = Utils.encodeUrl('e1');

        expect(encodedURL).toBe('e1');
    })
})

describe("parameter helper", () => {
    it('can extract queue params', () => {
        const queueitToken = 'ts_1480593661~cv_10~ce_false~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895~c_customerid~e_eventid~rt_disabled~h_218b734e-d5be-4b60-ad66-9b1b326266e2';
        let result = QueueParameterHelper.extractQueueParams(queueitToken);

        expect(result).not.toBeNull('result should be parsed');
        expect<i64>(result!.timeStamp).toBe(1480593661)
        expect(result!.eventId).toBe("eventid");
        expect(result!.cookieValidityMinutes).toBe(10);
        expect(result!.extendableCookie).toBeFalsy();
        expect(result!.hashCode).toBe('218b734e-d5be-4b60-ad66-9b1b326266e2', 'hash should be extracted');
        expect(result!.queueITToken).toBe(queueitToken);
        expect(result!.queueITTokenWithoutHash).toBe('ts_1480593661~cv_10~ce_false~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895~c_customerid~e_eventid~rt_disabled');
    });

    it('can handle non-valid formats', () => {
        const queueITToken = 'ts_sasa~cv_adsasa~ce_falwwwse~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895~h_218b734e-d5be-4b60-ad66-9b1b326266e2';
        const queueitTokenWithoutHash = 'ts_sasa~cv_adsasa~ce_falwwwse~q_944c1f44-60dd-4e37-aabc-f3e4bb1c8895';
        const result = QueueParameterHelper.extractQueueParams(queueITToken);

        expect(result!.timeStamp).toBe(0);
        expect(result!.eventId).toBeFalsy();
        expect(result!.cookieValidityMinutes).toBe(0);
        expect(result!.extendableCookie).toBeFalsy();
        expect(result!.hashCode).toBe('218b734e-d5be-4b60-ad66-9b1b326266e2');
        expect(result!.queueITToken).toBe(queueITToken);
        expect(result!.queueITTokenWithoutHash).toBe(queueitTokenWithoutHash);
    });

    it('can use queueittoken with no values', ()=>{
        const queueITToken = "e~q~ts~ce~rt~h";
        const result = QueueParameterHelper.extractQueueParams(queueITToken);

        expect(result!.timeStamp).toBe(0);
        expect(result!.eventId).toBeFalsy();
        expect(result!.cookieValidityMinutes).toBe(0);
        expect(result!.extendableCookie).toBeFalsy();
        expect(result!.hashCode).toBeFalsy();
        expect(result!.queueITToken).toBe(queueITToken);
        expect(result!.queueITTokenWithoutHash).toBe(queueITToken);
    });

    it('returns null when no queueittoken is given', ()=>{
        const queueITToken = "";
        const result = QueueParameterHelper.extractQueueParams(queueITToken);

        expect(result).toBeNull();
    });
});
