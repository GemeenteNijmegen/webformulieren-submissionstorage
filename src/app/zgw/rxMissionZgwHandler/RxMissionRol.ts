import { ZakenApiRolRequest } from "../zgwClient/model/ZakenApiRol.model";
import { ZgwClient } from "../zgwClient/ZgwClient";
import { SubmissionZaakProperties } from "./RxMissionZgwConfiguration";

interface RXMissionRolConfig {
    zgwClient: ZgwClient;
    submissionZaakProperties: SubmissionZaakProperties;
    submission: any;
}

/**
 * Adds rol(len) to a zaak
 * Extracting the needed data from the submission and submissionProperties to build the right request(s)
 * The types in ZakenApiRol can be used to build the RolRequest
 */
export class RXMissionRol {
    private zgwClient: ZgwClient;
    private submissionZaakProperties: SubmissionZaakProperties;

    constructor(config: RXMissionRolConfig){
        this.zgwClient = config.zgwClient;
        this.submissionZaakProperties = config.submissionZaakProperties;
    }

    public async addRolToZaak(){
        console.debug(this.submissionZaakProperties);
        // Build the RolRequest based on submission and submissionZaakProperties
        // Maybe even add two roles (belanghebbende) if needed
        this.callCreateRol({} as any as ZakenApiRolRequest);
    };

    private async callCreateRol(request: ZakenApiRolRequest) {
        const result = await this.zgwClient.createRol(request);
        return result;
    }
}

