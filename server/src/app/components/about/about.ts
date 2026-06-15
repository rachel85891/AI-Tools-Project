// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-about',
//   templateUrl: './about.html',
//   styleUrls: ['./about.scss']
// })
// export class AboutComponent {
  
// }
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.html',
  styleUrls: ['./about.scss']
})
export class AboutComponent {
  features = [
    { title: 'בחירה חכמה', desc: 'אלגוריתם שמתאים לכם הופעות לפי טעם אישי.', icon: 'pi-bolt', color: '#00d2ff' },
    { title: 'אפס המתנה', desc: 'מערכת כרטוס מהירה בטכנולוגיית Real-time.', icon: 'pi-spin pi-sync', color: '#0070f3' },
    { title: 'ביטחון מוחלט', desc: 'הצפנה מתקדמת לכל טרנזקציה.', icon: 'pi-shield', color: '#7928ca' }
  ];

  testimonials = [
    { name: 'דניאל כהן', role: 'חובב מוזיקה', text: 'האתר הכי מהיר שקניתי בו כרטיסים אי פעם!', avatar: 'D' },
    { name: 'מיכל לוי', role: 'אמא ל-3', text: 'מפת המושבים פשוט גאונית, הילדים נהנו מאוד.', avatar: 'M' },
    { name: 'יוסי אברהם', role: 'מפיק אירועים', text: 'סטנדרט חדש של שירות ואמינות בישראל.', avatar: 'Y' }
  ];
}