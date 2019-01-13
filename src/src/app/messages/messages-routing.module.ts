import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Servicios --> para poder usar el Guard en cualquier ruta
import { UserGuard } from '../services/user.guard';

// Components
import { MainComponent } from './components/main/main.component';
import { AddComponent } from './components/add/add.component';
import { ReceivedComponent } from './components/received/received.component';
import { SendedComponent } from './components/sended/sended.component';

const messagesRoutes: Routes = [
	{
		path: 'messages', 
		component: MainComponent,
		children: [		// --> engloba a todas la rutas precedidas por el path
			{ path: '', redirectTo: 'inbox/1', pathMatch: 'full', canActivate:[UserGuard]},
			{ path: 'send', component: AddComponent, canActivate:[UserGuard]},
			{ path: 'inbox/:page', component: ReceivedComponent, canActivate:[UserGuard]},
			{ path: 'sent/:page', component: SendedComponent, canActivate:[UserGuard]},
		]
	},
];

@NgModule({
	imports: [
		RouterModule.forChild(messagesRoutes)
	],
	exports: [
		RouterModule
	],
})

export class MessagesRoutingModule {}

// export const routing: ModuleWithProviders = RouterModule.forRoot(messagesRoutes);	//--> así carga todo.