import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, tap, throwError, finalize } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CommonService } from '../services/common.service';
import { TokenService } from '../services/token.service';
import { saveAs } from 'file-saver';


@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(
    private http: HttpClient,
    private router: Router,
    private _commonService: CommonService,
    private _tokenService: TokenService
  ) { }

  apiRequest(api: any, body?: any) {
    this._commonService.setLoader(true);
    // console.log(JSON.stringify(api))
    // console.log(body)

    let httpMethod: Observable<any>;
    switch (api['type']) {
      case 'Post':
        httpMethod = this.http.post(environment.api_url + api['endURL'], body ?? {});
        break;
      case 'Get':
        if(typeof body === 'object') {
          body = this.buildQueryParams(body);
        }
        httpMethod = this.http.get(environment.api_url + api['endURL'] + (body ?? ''));
        break;
      case 'Delete':
        httpMethod = this.http.delete(environment.api_url + api['endURL'] + body);
        break;
      case 'Put':
        let id = body.apiId;
        delete body.apiId;
        httpMethod = this.http.put(environment.api_url + api['endURL'] + id, body ?? {});
        break;
      case 'Download':
         if(typeof body === 'object') {
          body = this.buildQueryParams(body);
        }
        httpMethod = this.http.get(environment.api_url + api['endURL'] + body, { responseType: 'blob', observe: 'response' });
        break;
      default:
        throw new Error('Method not supported');
    }

    return httpMethod.pipe(
      tap((res: any) => {
        if (api.type == 'Download' && res.status == 200) {
          this.handleFileDownload(res);
        }
      }),

      catchError(error => {
        return throwError(
          () => this.handleError(error)
        );
      }),
      finalize(() => {
         this._commonService.setLoader(false);
      })

    );
  }

  uploadMedia(api: any, request: any) {
    let httpOptions: any = {
      headers: new HttpHeaders({
      })
    };
    httpOptions['reportProgress'] = true;
    httpOptions['observe'] = 'events';
    return this.http.post(environment.api_url + api['endURL'], request, httpOptions);
  }

  handleError(error: HttpErrorResponse) {
    if (error.status == 401) {
      this._tokenService.clearToken();
      this.router.navigate(['/login']);
    }

    let errorMsg: string;
    if (error.error instanceof ErrorEvent) {
      errorMsg = error.error.message;
    } else if (error.error?.data?.message) {
      errorMsg = error.error.data.message;
    } else if (typeof error.error === 'string') {
      errorMsg = error.error;
    } else {
      errorMsg = `Backend returned code ${error.status}`;
    }

    return new Error(errorMsg);
  }

  buildQueryParams(params: any): string {
    let queryString = '';
    Object.keys(params).forEach((key, index) => {
      const value = params[key];
      if (
        value === null ||
        value === undefined ||
        value === ''
      ) {
        return;
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.keys(value).forEach(innerKey => {
          const innerValue = value[innerKey];
          if (
            innerValue !== null &&
            innerValue !== undefined &&
            innerValue !== ''
          ) {
            queryString += `${queryString ? '&' : '?'}${innerKey}=${encodeURIComponent(innerValue)}`;
          }
        });
      } else {
        queryString += `${queryString ? '&' : '?'}${key.replace('form_', '')}=${encodeURIComponent(value)}`;
      }
    });
    return queryString;
  }

  private handleFileDownload(
    response: any
  ): void {
    const contentType = response.headers.get('content-type');
    const contentDisposition = response.headers.get('content-disposition');

    let filename = 'download';
    if (contentDisposition) {
      filename =
        contentDisposition
          .split('filename=')[1]
          ?.replace(/['"]/g, '')
          ?.trim();
    }

    const blob = new Blob(
      [response.body],
      {
        type: contentType
      }
    );

    saveAs(blob, filename);
  }

}
