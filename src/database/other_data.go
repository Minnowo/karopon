package database

type UserEventWithFoods struct {
	Event TblUserEvent
	Foods []TblUserFoodLog
}
