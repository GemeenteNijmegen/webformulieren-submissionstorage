export class SubmissionUtils {

  static findEmail(submission: any) {
    const options = [
      'eMailadres',
      'eMailadres1',
      'eMailadres2',
    ];
    return this.findField(submission, options);
  }

  static findTelefoon(submission: any) {
    const options = [
      'telefoonnummer',
      'telefoon',
    ];
    return this.findField(submission, options);
  }

  static findField(submission: any, fields: string[]) {
    for (const field of fields) {
      const email = SubmissionUtils.findValueByKey(submission, field);
      if (email) {
        return email;
      }
    }
    return undefined;
  }

  static findValueByKey(obj: any, keyToFind: string): any | undefined {
    if (typeof obj !== 'object' || obj === null) {
      return undefined;
    }

    // Check if the current object has the key
    if (keyToFind in obj) {
      return obj[keyToFind];
    }

    // Recursively check nested objects
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        const value = SubmissionUtils.findValueByKey(obj[key], keyToFind);
        if (value !== undefined) {
          return value;
        }
      }
    }

    return undefined;
  }


  static findKanaalvoorkeur(submission: any) {
    const kanaalvoorkeur = SubmissionUtils.findField(submission, [
      'hoeWiltUOpDeHoogteGehoudenWorden',
    ]);
    if (!kanaalvoorkeur) {
      return undefined;
    } else if ( ['SMS', 'sms'].includes(kanaalvoorkeur)) {
      return 'sms';
    } else if ( ['E-mail', 'e-mail', 'email', 'EMAIL'].includes(kanaalvoorkeur)) {
      return 'email';
    }
    return undefined;
  }

}