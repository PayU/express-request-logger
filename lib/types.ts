import { Request, Response } from 'express';

export type LevelsMap = {
    [key: string]: string;
    '2xx': string;
    '3xx': string;
    '4xx': string;
    '5xx': string;
};

export type AuditOptions = {
    logger: any;
    request: {
        audit: boolean;
        maskBody: string[];
        maskQuery: string[];
        maskHeaders: string[];
        excludeBody: string[];
        excludeHeaders: string[];
        customMaskBodyFunc: (req: AugmentedRequest) => any;
        maxBodyLength: number | undefined;
    };
    response: {
        audit: boolean;
        maskBody: string[];
        maskHeaders: string[];
        excludeBody: string[];
        excludeHeaders: string[];
        maxBodyLength: number | undefined;
    };
    doubleAudit: boolean;
    excludeURLs: string[];
    levels: LevelsMap;
    setupFunc: (req: Request, res?: Response) => void;
};

export type AugmentedRequest = Request & {
    additionalAudit?: any;
    timestamp?: Date;
}

export type AugmentedResponse = Response & {
    additionalAudit?: any;
    _bodyStr?: string;
    _bodyJson?: any;
    timestamp?: Date;
}

