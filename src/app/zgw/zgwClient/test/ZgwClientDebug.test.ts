/**
 * Unit tests to help debug the calls for development purposes
 */

import { Bsn } from "@gemeentenijmegen/utils";
import { ZgwClient } from "../ZgwClient";
import { getFetchMockResponse } from "./testUtils";

describe('ZGW Client Dbug', () => {
    const client = new ZgwClient({
        documentenApiUrl: 'https://documenten-api',
        zakenApiUrl: 'https://zaken-api',
        informatieobjecttype: 'https://catalogi-api/informatieobjecttype',
        zaakstatus: 'https://catalogi-api/zaakstatus',
        zaaktype: 'https://catalogi-api/zaaktype',
        name: 'Test',
        clientId: 'id',
        clientSecret: 'secret',
        roltype: 'https://roltype',
      });

    /**
     * Copy me for base test
     */  
    xtest('methodName', async () => {
        //default test format for debugging

        //Spy on fetch, response does not matter
        const spyOnFetch = jest.spyOn(global, 'fetch').mockResolvedValue(getFetchMockResponse() as any as Response);
        
        //Make yout client call
        //await client.createZaak('R02.0002', 'mockFormulierNaam');

        const interceptedRequest0 = spyOnFetch.mock.calls[0];
        console.dir(interceptedRequest0, {colors: true});
    })
    xtest('getZaak', async () => {
        //default test format for debugging

        //Spy on fetch, response does not matter
        const spyOnFetch = jest.spyOn(global, 'fetch').mockResolvedValue(getFetchMockResponse() as any as Response);
        //Make your client call
        await client.getZaak('R02.0002');

        const interceptedRequest0 = spyOnFetch.mock.calls[0];
        console.dir(interceptedRequest0, {colors: true});

    })
    xtest('createZaak', async () => {
        //default test format for debugging

        //Spy on fetch, response does not matter
        const spyOnFetch = jest.spyOn(global, 'fetch').mockResolvedValue(getFetchMockResponse() as any as Response);
        

        //Make your client call
        await client.createZaak('R01.0001', 'mockFormulierNaam');

        const interceptedRequest0 = spyOnFetch.mock.calls[0];
        console.dir(interceptedRequest0, {colors: true});
        const interceptedRequest1 = spyOnFetch.mock.calls[1];
        console.dir(interceptedRequest1, {colors: true}); 
    });
    xtest('addDocumentToZaak', async () => {
        //default test format for debugging

        //Spy on fetch, response does not matter
        const spyOnFetch = jest.spyOn(global, 'fetch').mockResolvedValue(getFetchMockResponse() as any as Response);
        
        //Make your client call
        await client.addDocumentToZaak('R03.0003', 'mockDocumentNaam', 'mockBase64');

        const interceptedRequest0 = spyOnFetch.mock.calls[0];
        console.dir(interceptedRequest0, {colors: true});
        const interceptedRequest1 = spyOnFetch.mock.calls[1];
        console.dir(interceptedRequest1, {colors: true}); 
    });
    xtest('addZaakEigenschap', async () => {
        //default test format for debugging

        //Spy on fetch, response does not matter
        const spyOnFetch = jest.spyOn(global, 'fetch').mockResolvedValue(getFetchMockResponse() as any as Response);
        
        //Make yout client call
        await client.addZaakEigenschap('R02.0002', 'mockEigenschap', 'mockwaarde');

        const interceptedRequest0 = spyOnFetch.mock.calls[0];
        console.dir(interceptedRequest0, {colors: true});
    });
    xtest('addRoleToZaak', async () => {
        //default test format for debugging

        //Spy on fetch, response does not matter
        const spyOnFetch = jest.spyOn(global, 'fetch').mockResolvedValue(getFetchMockResponse() as any as Response);
        
        //Make your client call
        await client.addBsnRoleToZaak('R02.0002', '9000239023' as any as Bsn);

        const interceptedRequest0 = spyOnFetch.mock.calls[0];
        console.dir(interceptedRequest0, {colors: true});
    });
});
