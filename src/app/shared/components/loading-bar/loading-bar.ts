import { Component, inject } from '@angular/core';
import { CommonService } from '../../services/common.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  templateUrl: './loading-bar.html',
  styleUrl: './loading-bar.scss',
})
export class LoadingBar {
  private commonService = inject(CommonService);
  readonly loading = this.commonService.loading;
}
